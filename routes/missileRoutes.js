const express = require('express');
const geoip = require('geoip-lite');
const databaseService = require('../services/databaseService');
const getIP = require('../utils/getIP');

const router = express.Router();
const MISSILE_COOLDOWN_MS =  (1 * 60 * 60 * 1000)/2; // 30 minutes for testing
const ADMIN_PASSWORD = "supersecret123123ret123123";
router.post('/missile', async (req, res) => {
  const ip = getIP(req);
  const geo = geoip.lookup(ip);
  const userCountry = geo?.country || 'XX';
  const targetCountry = req.query.target ? req.query.target.toUpperCase() : null;
  let amount = parseInt(req.query.amount);

  if (!targetCountry) return res.status(400).send('Missing target country');
  if (isNaN(amount) || amount <= 0) return res.status(400).send('Invalid amount');

  try {
    // Cooldown check
    const canLaunch = await databaseService.canLaunchMissile(userCountry, MISSILE_COOLDOWN_MS);
    if (!canLaunch) {
      return res.status(403).send(`Your country ${userCountry} can only launch once per day.`);
    }

    // Apply missile to target
    const targetClicks = await databaseService.getCountryClicks(targetCountry);
    if (!targetClicks) return res.status(404).send(`No clicks recorded for ${targetCountry}`);

    const { clicks } = targetClicks;
    const newClicks = Math.max(0, clicks - amount);
    
    // Update target country clicks
    await databaseService.pool.query(
      'UPDATE country_clicks SET clicks = $1 WHERE country_code = $2',
      [newClicks, targetCountry]
    );
    
    const diff = clicks - newClicks;
    if (diff > 0) {
      await databaseService.updateGlobalCount(-diff);
    }

    // Update missile cooldown
    await databaseService.updateLastMissileTime(userCountry);

    res.send(`Missile applied! ${diff} clicks removed from ${targetCountry}`);
  } catch (err) {
    console.error('Error applying missile:', err);
    res.status(500).send('Error applying missile');
  }
});

router.get('/missile-status', async (req, res) => {
  try {
    const ip = getIP(req);
    const geo = geoip.lookup(ip);
    const userCountry = geo?.country || 'XX';

    const canLaunch = await databaseService.canLaunchMissile(userCountry, MISSILE_COOLDOWN_MS);
    if (canLaunch) return res.json({ canLaunch: true });

    const lastMissile = await databaseService.getLastMissileTime(userCountry);
    const diff = Date.now() - new Date(lastMissile).getTime();

    const remainingMs = MISSILE_COOLDOWN_MS - diff;
    const hours = Math.floor(remainingMs / (1000*60*60));
    const minutes = Math.floor((remainingMs % (1000*60*60)) / (1000*60));
    const seconds = Math.floor((remainingMs % (1000*60)) / 1000);

    res.json({ canLaunch: false, hours, minutes, seconds });
  } catch (err) {
    console.error('Error checking missile status:', err);
    res.status(500).json({ canLaunch: false });
  }
});
router.post('/reset-missile-cooldown', async (req, res) => {
  const { password, country_code } = req.query;

  // Check admin password
  if (password !== ADMIN_PASSWORD) {
    return res.status(403).send('Access denied. Wrong password.');
  }

  if (!country_code) {
    return res.status(400).send('Missing country_code');
  }

  try {
    // Reset the missile cooldown for the specified country
    await databaseService.pool.query(`
      INSERT INTO country_missiles (country_code, last_missile)
      VALUES ($1, NULL)
      ON CONFLICT (country_code) DO UPDATE SET last_missile = NULL
    `, [country_code.toUpperCase()]);

    res.send(`Missile cooldown for ${country_code.toUpperCase()} has been reset.`);
  } catch (err) {
    console.error('Error resetting missile cooldown:', err);
    res.status(500).send('Error resetting missile cooldown.');
  }
});

module.exports = router;
