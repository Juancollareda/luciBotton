const express = require('express');
const router = express.Router();
const pool = require('../db');
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
        const challengerResult = await pool.query(
            'SELECT clicks FROM country_clicks WHERE country_code = $1',
            [challengerCountry]
        );

        if (!challengerResult.rows[0] || challengerResult.rows[0].clicks < betAmount) {
            return res.status(400).json({ error: 'Not enough clicks to place bet' });
        }

        // Create the challenge
        const result = await pool.query(
            `INSERT INTO country_challenges 
            (challenger_country, challenged_country, bet_amount)
            VALUES ($1, $2, $3)
            RETURNING id`,
            [challengerCountry, challengedCountry, betAmount]
        );

        // Lock the bet amount
        await pool.query(
            'UPDATE country_clicks SET clicks = clicks - $1 WHERE country_code = $2',
            [betAmount, challengerCountry]
        );

        res.json({ 
            message: 'Challenge created successfully',
            challengeId: result.rows[0].id
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
        const challengeResult = await pool.query(
            'SELECT * FROM country_challenges WHERE id = $1 AND status = $2',
            [challengeId, 'pending']
        );

        if (!challengeResult.rows[0]) {
            return res.status(404).json({ error: 'Challenge not found or already accepted' });
        }

        const challenge = challengeResult.rows[0];
        
        if (challenge.challenged_country !== acceptingCountry) {
            return res.status(403).json({ error: 'Not authorized to accept this challenge' });
        }

        // Check if accepting country has enough clicks
        const acceptingResult = await pool.query(
            'SELECT clicks FROM country_clicks WHERE country_code = $1',
            [acceptingCountry]
        );

        if (!acceptingResult.rows[0] || acceptingResult.rows[0].clicks < challenge.bet_amount) {
            return res.status(400).json({ error: 'Not enough clicks to accept challenge' });
        }

        // Lock the bet amount
        await pool.query(
            'UPDATE country_clicks SET clicks = clicks - $1 WHERE country_code = $2',
            [challenge.bet_amount, acceptingCountry]
        );

        // Update challenge status
        await pool.query(
            'UPDATE country_challenges SET status = $1 WHERE id = $2',
            ['active', challengeId]
        );

        // Notify both countries through WebSocket
        global.broadcast('challengeStart', { 
            challengeId,
            challengerCountry: challenge.challenger_country,
            challengedCountry: challenge.challenged_country
        });

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
        const challengeResult = await pool.query(
            'SELECT * FROM country_challenges WHERE id = $1 AND status = $2',
            [challengeId, 'active']
        );

        if (!challengeResult.rows[0]) {
            return res.status(404).json({ error: 'Challenge not found or not active' });
        }

        const challenge = challengeResult.rows[0];
        const loserCountry = challenge.challenger_country === winnerCountry 
            ? challenge.challenged_country 
            : challenge.challenger_country;

        // Award the winner with their original bet + the loser's bet
        const totalPrize = challenge.bet_amount * 2;
        await pool.query(
            'UPDATE country_clicks SET clicks = clicks + $1 WHERE country_code = $2',
            [totalPrize, winnerCountry]
        );

        // Update challenge status
        await pool.query(
            'UPDATE country_challenges SET status = $1, winner_country = $2 WHERE id = $3',
            ['completed', winnerCountry, challengeId]
        );

        res.json({ 
            message: 'Challenge completed successfully',
            winner: winnerCountry,
            prize: totalPrize
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

        const result = await pool.query(
            `SELECT * FROM country_challenges 
            WHERE (challenger_country = $1 OR challenged_country = $1)
            AND status IN ('pending', 'active')
            ORDER BY created_at DESC`,
            [countryCode]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Error getting challenges:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;