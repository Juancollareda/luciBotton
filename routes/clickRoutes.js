const express = require('express');
const geoip = require('geoip-lite');
const pool = require('../db');
const getIP = require('../utils/getIP');

const router = express.Router();

let boostActive = false;

router.get('/clicked', async (req, res) => {
  const ip = getIP(req);
  const geo = geoip.lookup(ip);
  const countryCode = geo?.country || 'XX';

  try {
    const increment = boostActive ? 2 : 1;
    await pool.query('UPDATE counter SET count = count + $1 WHERE id = 1', [increment]);
    await pool.query(`
      INSERT INTO country_clicks (country_code, clicks)
      VALUES ($1, $2)
      ON CONFLICT (country_code)
      DO UPDATE SET clicks = country_clicks.clicks + $2;
    `, [countryCode, increment]);

    const result = await pool.query('SELECT count FROM counter WHERE id = 1');
    res.send(`thanks for clicking. Total: ${result.rows[0].count}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error updating clicks.');
  }
});

router.get('/count', async (req, res) => {
  try {
    const result = await pool.query('SELECT count FROM counter WHERE id = 1');
    res.send(`Button has been clicked ${result.rows[0].count} times`);
  } catch (err) {
    console.error(err);
    res.status(500).send('cant find counter');
  }
});

router.get('/paises', async (req, res) => {
  try {
    const result = await pool.query('SELECT country_code, clicks FROM country_clicks ORDER BY clicks DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching country clicks');
  }
});

module.exports = { router, setBoostActive: (val) => { boostActive = val; } };
