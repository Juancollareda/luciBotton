const express = require('express');
const router = express.Router();
const getIP = require('../utils/getIP');
const geoip = require('geoip-lite');

// Get current user's country
router.get('/api/current-country', (req, res) => {
    try {
        const ip = getIP(req);
        const geo = geoip.lookup(ip);
        const countryCode = geo ? geo.country : 'XX';
        res.json({ country: countryCode });
    } catch (error) {
        console.error('Error getting country:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;