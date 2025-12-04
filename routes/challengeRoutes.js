const express = require('express');
const router = express.Router();
const databaseService = require('../services/databaseService');
const getIP = require('../utils/getIP');
const geoip = require('geoip-lite');

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

        // Lock the bet amount
        await databaseService.pool.query(
            'UPDATE country_clicks SET clicks = clicks - $1 WHERE country_code = $2',
            [betAmount, challengerCountry]
        );

        res.json({ 
            message: 'Challenge created successfully',
            challengeId: challengeId.id
        });
    } catch (error) {
        console.error('Error creating challenge:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Accept a challenge
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

        // Lock the bet amount
        await databaseService.pool.query(
            'UPDATE country_clicks SET clicks = clicks - $1 WHERE country_code = $2',
            [challenge.bet_amount, acceptingCountry]
        );

        // Update challenge status
        await databaseService.updateChallengeStatus(challengeId, 'active');

        // Notify both countries through WebSocket
        if (global.broadcast) {
            global.broadcast('challengeStart', { 
                challengeId,
                challengerCountry: challenge.challenger_country,
                challengedCountry: challenge.challenged_country
            });
        }

        res.json({ message: 'Challenge accepted successfully' });
    } catch (error) {
        console.error('Error accepting challenge:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// End a challenge (winner takes all)
router.post('/api/challenge/:id/end', async (req, res) => {
    try {
        const challengeId = req.params.id;
        const { winnerCountry } = req.body;

        // Get challenge details
        const challenge = await databaseService.getChallenge(challengeId);

        if (!challenge || challenge.status !== 'active') {
            return res.status(404).json({ error: 'Challenge not found or not active' });
        }

        const betAmount = challenge.bet_amount;

        // Award the winner with their original bet + the loser's bet
        await databaseService.completeChallenge(challengeId, winnerCountry, betAmount);

        res.json({ 
            message: 'Challenge completed successfully',
            winner: winnerCountry,
            prize: betAmount * 2
        });
    } catch (error) {
        console.error('Error ending challenge:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get active challenges for a country
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