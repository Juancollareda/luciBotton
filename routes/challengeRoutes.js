const express = require('express');
const router = express.Router();
const databaseService = require('../services/databaseService');
const getIP = require('../utils/getIP');
const geoip = require('geoip-lite');

// Store active challenges in memory for click tracking
const activeChallenges = new Map();

// Create a new challenge
router.post('/api/challenge', async (req, res) => {
    try {
        const ip = getIP(req);
        const geo = geoip.lookup(ip);
        const challengerCountry = geo ? geo.country : 'XX';
        const { challengedCountry, betAmount } = req.body;

        // Check if challenger has enough clicks
        const challengerClicks = await databaseService.getCountryClicks(challengerCountry);

        if (!challengerClicks || challengerClicks.clicks < betAmount) {
            return res.status(400).json({ error: 'Not enough clicks to place bet' });
        }

        // Create the challenge
        const challengeId = await databaseService.createChallenge(
            challengerCountry,
            challengedCountry,
            betAmount
        );

        // Lock the bet amount for challenger
        await databaseService.pool.query(
            'UPDATE country_clicks SET clicks = clicks - $1 WHERE country_code = $2',
            [betAmount, challengerCountry]
        );

        // Broadcast challenge creation to all connected clients
        if (global.broadcast) {
            global.broadcast({
                type: 'newChallenge',
                data: {
                    id: challengeId.id,
                    challenger_country: challengerCountry,
                    challenged_country: challengedCountry,
                    bet_amount: betAmount,
                    created_at: new Date()
                }
            });
        }

        res.json({ 
            message: 'Challenge created successfully',
            challengeId: challengeId.id
        });
    } catch (error) {
        console.error('Error creating challenge:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Accept a challenge and start the duel
router.post('/api/challenge/:id/accept', async (req, res) => {
    try {
        const challengeId = req.params.id;
        const ip = getIP(req);
        const geo = geoip.lookup(ip);
        const acceptingCountry = geo ? geo.country : 'XX';

        // Get challenge details
        const challenge = await databaseService.getChallenge(challengeId);

        if (!challenge || challenge.status !== 'pending') {
            return res.status(404).json({ error: 'Challenge not found or already accepted' });
        }
        
        if (challenge.challenged_country !== acceptingCountry) {
            return res.status(403).json({ error: 'Not authorized to accept this challenge' });
        }

        // Check if accepting country has enough clicks
        const acceptingClicks = await databaseService.getCountryClicks(acceptingCountry);

        if (!acceptingClicks || acceptingClicks.clicks < challenge.bet_amount) {
            return res.status(400).json({ error: 'Not enough clicks to accept challenge' });
        }

        // Lock the bet amount for challenged country
        await databaseService.pool.query(
            'UPDATE country_clicks SET clicks = clicks - $1 WHERE country_code = $2',
            [challenge.bet_amount, acceptingCountry]
        );

        // Update challenge status to active
        await databaseService.updateChallengeStatus(challengeId, 'active');

        // Initialize challenge tracking
        activeChallenges.set(challengeId, {
            id: challengeId,
            challenger_country: challenge.challenger_country,
            challenged_country: challenge.challenged_country,
            challenger_clicks: 0,
            challenged_clicks: 0,
            bet_amount: challenge.bet_amount,
            start_time: Date.now(),
            duration: 30000, // 30 seconds
            status: 'active'
        });

        // Broadcast challenge start to both countries
        if (global.broadcast) {
            global.broadcast({
                type: 'challengeStart',
                data: {
                    challengeId,
                    challenger_country: challenge.challenger_country,
                    challenged_country: challenge.challenged_country,
                    bet_amount: challenge.bet_amount,
                    message: `${challenge.challenger_country} challenged ${challenge.challenged_country} for ${challenge.bet_amount} clicks!`
                }
            });
        }

        res.json({ message: 'Challenge accepted! Duel starting!' });
    } catch (error) {
        console.error('Error accepting challenge:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Record clicks during challenge
router.post('/api/challenge/:id/click', async (req, res) => {
    try {
        const challengeId = req.params.id;
        const ip = getIP(req);
        const geo = geoip.lookup(ip);
        const countryCode = geo ? geo.country : 'XX';

        // Check if challenge exists and is active
        const challengeData = activeChallenges.get(challengeId);
        if (!challengeData || challengeData.status !== 'active') {
            return res.status(404).json({ error: 'Challenge not found or not active' });
        }

        // Check if this country is part of the challenge
        if (countryCode !== challengeData.challenger_country && countryCode !== challengeData.challenged_country) {
            return res.status(403).json({ error: 'Not authorized for this challenge' });
        }

        // Check if challenge time is up
        const elapsedTime = Date.now() - challengeData.start_time;
        if (elapsedTime > challengeData.duration) {
            // Challenge is over, end it
            endChallenge(challengeId);
            return res.status(400).json({ error: 'Challenge time is up!' });
        }

        // Record the click
        if (countryCode === challengeData.challenger_country) {
            challengeData.challenger_clicks++;
        } else {
            challengeData.challenged_clicks++;
        }

        res.json({ 
            success: true, 
            clicks: countryCode === challengeData.challenger_country ? 
                challengeData.challenger_clicks : challengeData.challenged_clicks
        });
    } catch (error) {
        console.error('Error recording challenge click:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get challenge results
router.get('/api/challenge/:id/result', async (req, res) => {
    try {
        const challengeId = req.params.id;
        
        const challengeData = activeChallenges.get(challengeId);
        if (!challengeData) {
            return res.status(404).json({ error: 'Challenge not found' });
        }

        // Check if challenge is still active or ended
        const elapsedTime = Date.now() - challengeData.start_time;
        const isOver = elapsedTime > challengeData.duration;

        if (isOver && challengeData.status === 'active') {
            // End the challenge
            await endChallenge(challengeId, challengeData);
        }

        // Determine winner
        let winner, winnerClicks, loserClicks;
        if (challengeData.challenger_clicks > challengeData.challenged_clicks) {
            winner = challengeData.challenger_country;
            winnerClicks = challengeData.challenger_clicks;
            loserClicks = challengeData.challenged_clicks;
        } else if (challengeData.challenged_clicks > challengeData.challenger_clicks) {
            winner = challengeData.challenged_country;
            winnerClicks = challengeData.challenged_clicks;
            loserClicks = challengeData.challenger_clicks;
        } else {
            winner = 'TIE';
            winnerClicks = challengeData.challenger_clicks;
            loserClicks = challengeData.challenged_clicks;
        }

        res.json({
            challenge_id: challengeId,
            challenger_country: challengeData.challenger_country,
            challenged_country: challengeData.challenged_country,
            challenger_clicks: challengeData.challenger_clicks,
            challenged_clicks: challengeData.challenged_clicks,
            winner_country: winner,
            bet_amount: challengeData.bet_amount,
            prize: winner === 'TIE' ? 'Bets returned' : `${challengeData.bet_amount * 2}`,
            message: winner === 'TIE' ? 
                '🤝 It\'s a tie! Bets returned to both.' :
                `🏆 ${winner} wins ${challengeData.bet_amount * 2} clicks!`
        });
    } catch (error) {
        console.error('Error getting challenge result:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Helper function to end a challenge
async function endChallenge(challengeId, challengeData) {
    try {
        const challenge = challengeData || activeChallenges.get(challengeId);
        if (!challenge) return;

        challenge.status = 'completed';

        // Determine winner
        let winner;
        if (challenge.challenger_clicks > challenge.challenged_clicks) {
            winner = challenge.challenger_country;
        } else if (challenge.challenged_clicks > challenge.challenger_clicks) {
            winner = challenge.challenged_country;
        } else {
            winner = 'TIE';
        }

        if (winner !== 'TIE') {
            // Award winner
            const totalPrize = challenge.bet_amount * 2;
            await databaseService.pool.query(
                'UPDATE country_clicks SET clicks = clicks + $1 WHERE country_code = $2',
                [totalPrize, winner]
            );

            // Update winner stats
            await databaseService.pool.query(
                'UPDATE country_stats SET challenges_won = challenges_won + 1 WHERE country_code = $1',
                [winner]
            );

            // Update loser stats
            const loser = winner === challenge.challenger_country ? 
                challenge.challenged_country : challenge.challenger_country;
            await databaseService.pool.query(
                'UPDATE country_stats SET challenges_lost = challenges_lost + 1 WHERE country_code = $1',
                [loser]
            );
        } else {
            // Tie - return bets to both
            await databaseService.pool.query(
                'UPDATE country_clicks SET clicks = clicks + $1 WHERE country_code IN ($2, $3)',
                [challenge.bet_amount, challenge.challenger_country, challenge.challenged_country]
            );
        }

        // Update challenge status in database
        await databaseService.updateChallengeStatus(challengeId, 'completed');

        // Broadcast results
        if (global.broadcast) {
            global.broadcast({
                type: 'challengeEnd',
                data: {
                    challengeId,
                    winner: winner,
                    challenger_clicks: challenge.challenger_clicks,
                    challenged_clicks: challenge.challenged_clicks,
                    message: winner === 'TIE' ? 
                        '🤝 Challenge ended in a tie!' :
                        `🏆 ${winner} wins the challenge!`
                }
            });
        }

        // Clean up from memory after a delay
        setTimeout(() => {
            activeChallenges.delete(challengeId);
        }, 5000);
    } catch (error) {
        console.error('Error ending challenge:', error);
    }
}

// Get active challenges
router.get('/api/challenges', async (req, res) => {
    try {
        const ip = getIP(req);
        const geo = geoip.lookup(ip);
        const countryCode = geo ? geo.country : 'XX';

        const challenges = await databaseService.getChallengesForCountry(countryCode);
        res.json(challenges);
    } catch (error) {
        console.error('Error getting challenges:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;