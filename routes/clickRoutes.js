const express = require('express');
const geoip = require('geoip-lite');
const pool = require('../db');
const getIP = require('../utils/getIP');

const router = express.Router();

let boostActive = false;
const ADMIN_PASSWORD = "supersecret123123ret123123";
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

router.get('/clickedgolden', async (req, res) => {
  const ip = getIP(req);
  const geo = geoip.lookup(ip);
  const countryCode = geo?.country || 'XX';
console.log("Golden apple clicked from IP:", ip, "Country:", countryCode);
  try {
    const increment = 1000;
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
router.delete('/erase-country', async (req, res) => {
  const { password, country_code } = req.query;
  if (password !== ADMIN_PASSWORD) return res.status(403).send('Access denied. Wrong password.');
  if (!country_code) return res.status(400).send('Missing country_code');

  try {
    const result = await pool.query('DELETE FROM country_clicks WHERE country_code = $1', [country_code.toUpperCase()]);
    if (result.rowCount === 0) return res.status(404).send(`Country ${country_code} not found.`);
    res.send(`Country ${country_code} clicks erased successfully.`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error deleting country clicks.');
  }
});

router.patch('/adjust-click', async (req, res) => {
  const { password, country_code, amount } = req.query;
  const amountInt = parseInt(amount);

  if (password !== ADMIN_PASSWORD) return res.status(403).send('Access denied.');
  if (!country_code || isNaN(amountInt)) return res.status(400).send('Invalid country_code or amount.');

  try {
    await pool.query(`
      INSERT INTO country_clicks (country_code, clicks)
      VALUES ($1, $2)
      ON CONFLICT (country_code)
      DO UPDATE SET clicks = country_clicks.clicks + $2
    `, [country_code.toUpperCase(), amountInt]);

    await pool.query('UPDATE counter SET count = count + $1 WHERE id = 1', [amountInt]);
    res.send(`${amountInt >= 0 ? 'Added' : 'Subtracted'} ${Math.abs(amountInt)} click(s) for ${country_code}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error adjusting clicks.');
  }
});


module.exports = { router, setBoostActive: (val) => { boostActive = val; } };
