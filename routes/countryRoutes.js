const express = require('express');
const router = express.Router();
const getCountry = require('../utils/getCountry');

// Get current user's country
router.get('/api/current-country', (req, res) => {
    try {
        const countryCode = getCountry(req);
        res.json({ country: countryCode });
    } catch (error) {
        console.error('Error getting country:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;