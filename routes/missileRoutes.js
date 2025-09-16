const express = require('express');
const geoip = require('geoip-lite');
const pool = require('../db');
const getIP = require('../utils/getIP');

const router = express.Router();

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
    const missileRes = await pool.query(
      'SELECT last_missile FROM country_missiles WHERE country_code = $1',
      [userCountry]
    );
    const now = new Date();
    if (missileRes.rows.length > 0 && missileRes.rows[0].last_missile) {
      const last = new Date(missileRes.rows[0].last_missile);
      if ((now - last) < 24*60*60*1000) {
        return res.status(403).send(`Your country ${userCountry} can only launch once per day.`);
      }
    }

    // Apply missile to target
    const countryRes = await pool.query(
      'SELECT clicks FROM country_clicks WHERE country_code = $1',
      [targetCountry]
    );
    if (!countryRes.rows.length) return res.status(404).send(`No clicks recorded for ${targetCountry}`);

    const { clicks } = countryRes.rows[0];
    const newClicks = Math.max(0, clicks - amount);
    await pool.query('UPDATE country_clicks SET clicks = $1 WHERE country_code = $2', [newClicks, targetCountry]);
    const diff = clicks - newClicks;
    if (diff > 0) await pool.query('UPDATE counter SET count = count - $1 WHERE id = 1', [diff]);

    await pool.query(`
      INSERT INTO country_missiles (country_code, last_missile)
      VALUES ($1, $2)
      ON CONFLICT (country_code) DO UPDATE SET last_missile = $2
    `, [userCountry, now]);

    res.send(`Missile applied! ${diff} clicks removed from ${targetCountry}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error applying missile');
  }
});

router.get('/missile-status', async (req, res) => {
  try {
    const ip = getIP(req);
    const geo = geoip.lookup(ip);
    const userCountry = geo?.country || 'XX';

    const missileRes = await pool.query(
      'SELECT last_missile FROM country_missiles WHERE country_code = $1',
      [userCountry]
    );

    if (!missileRes.rows.length || !missileRes.rows[0].last_missile) return res.json({ canLaunch: true });

    const diff = Date.now() - new Date(missileRes.rows[0].last_missile).getTime();
    const cooldown = 24 * 60 * 60 * 1000;

    if (diff >= cooldown) return res.json({ canLaunch: true });

    const remainingMs = cooldown - diff;
    const hours = Math.floor(remainingMs / (1000*60*60));
    const minutes = Math.floor((remainingMs % (1000*60*60)) / (1000*60));
    const seconds = Math.floor((remainingMs % (1000*60)) / 1000);

    res.json({ canLaunch: false, hours, minutes, seconds });
  } catch (err) {
    console.error(err);
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
    const result = await pool.query(`
      INSERT INTO country_missiles (country_code, last_missile)
      VALUES ($1, NULL)
      ON CONFLICT (country_code) DO UPDATE SET last_missile = NULL
    `, [country_code.toUpperCase()]);

    res.send(`Missile cooldown for ${country_code.toUpperCase()} has been reset.`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error resetting missile cooldown.');
  }
});

module.exports = router;
