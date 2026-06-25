const express = require('express');
const databaseService = require('../services/databaseService');
const getCountry = require('../utils/getCountry');
const getIP = require('../utils/getIP');
const twitchService = require('../services/twitchService');

const router = express.Router();

let boostActive = false;
const ADMIN_PASSWORD = "supersecret123123ret123123";
router.get('/clicked', async (req, res) => {
  const ip = getIP(req);
  const countryCode = getCountry(req);
  console.log('Click from IP:', ip, 'Country:', countryCode); // Debug log

  try {
    const baseIncrement = boostActive ? 2 : 1;
    const isLive = twitchService.getStreamStatus();
    const increment = isLive ? baseIncrement * 2 : baseIncrement;

    // Update global counter
    await databaseService.updateGlobalCount(increment);

    // Update country clicks
    await databaseService.updateCountryClicks(countryCode, increment);

    // Get updated rankings
    const rankings = await databaseService.getAllCountryClicks();

    // Broadcast the update
    if (global.broadcast) {
      global.broadcast('rankingUpdate', rankings);
    }

    const count = await databaseService.getGlobalCount();
    res.send(`thanks for clicking. Total: ${count}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error updating clicks.');
  }
});

router.get('/clickedgolden', async (req, res) => {
  const ip = getIP(req);
  const countryCode = getCountry(req);
  console.log("Golden apple clicked from IP:", ip, "Country:", countryCode);

  try {
    const increment = 1000; // golden touch value

    // Update country clicks with golden value
    await databaseService.updateCountryClicks(countryCode, increment);

    // Sync global counter to sum of all country clicks
    const total = await databaseService.syncGlobalCountToCountrySum();

    res.send(`Golden apple clicked! Total: ${total}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error updating clicks.');
  }
});



router.get('/count', async (req, res) => {
  try {
    const count = await databaseService.getGlobalCount();
    res.send(`Button has been clicked ${count} times`);
  } catch (err) {
    console.error(err);
    res.status(500).send('cant find counter');
  }
});

router.get('/paises', async (req, res) => {
  try {
    const results = await databaseService.getAllCountryClicks();
    res.json(results);
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
    const code = country_code.toUpperCase();
    
    // Delete references from dependent tables to avoid FK constraint violations
    await databaseService.pool.query('DELETE FROM country_challenges WHERE challenger_country = $1 OR challenged_country = $1', [code]);
    await databaseService.pool.query('DELETE FROM country_shields WHERE country_code = $1', [code]);
    await databaseService.pool.query('DELETE FROM country_stats WHERE country_code = $1', [code]);
    await databaseService.pool.query('DELETE FROM seasonal_rankings WHERE country_code = $1', [code]);
    await databaseService.pool.query('DELETE FROM country_missiles WHERE country_code = $1', [code]);

    const result = await databaseService.pool.query('DELETE FROM country_clicks WHERE country_code = $1', [code]);
    if (result.rowCount === 0) return res.status(404).send(`Country ${country_code} not found.`);
    
    // Sync global clicks count
    await databaseService.syncGlobalCountToCountrySum();

    // Broadcast updated rankings to all clients
    if (global.broadcast) {
      const rankings = await databaseService.getAllCountryClicks();
      global.broadcast('rankingUpdate', rankings);
    }

    res.send(`Country ${country_code} clicks and all related stats/challenges erased successfully.`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error deleting country clicks and related data.');
  }
});

router.patch('/adjust-click', async (req, res) => {
  const { password, country_code, amount } = req.query;
  const amountInt = parseInt(amount);

  if (password !== ADMIN_PASSWORD) return res.status(403).send('Access denied.');
  if (!country_code || isNaN(amountInt)) return res.status(400).send('Invalid country_code or amount.');

  try {
    await databaseService.updateCountryClicks(country_code.toUpperCase(), amountInt);
    await databaseService.updateGlobalCount(amountInt);
    res.send(`${amountInt >= 0 ? 'Added' : 'Subtracted'} ${Math.abs(amountInt)} click(s) for ${country_code}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error adjusting clicks.');
  }
});

// Admin override to toggle Twitch live status manually
router.get('/api/admin/set-live', (req, res) => {
  const { password, live } = req.query;
  if (password !== ADMIN_PASSWORD) {
    return res.status(403).send('Access denied. Wrong password.');
  }
  const liveBool = live === 'true';
  twitchService.setLive(liveBool);
  res.send(`Streamer live status manually set to: ${liveBool}`);
});

module.exports = { router, setBoostActive: (val) => { boostActive = val; } };
