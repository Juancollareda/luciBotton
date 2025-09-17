const express = require('express');
const geoip = require('geoip-lite');
const pool = require('../db');
const getIP = require('../utils/getIP');

const router = express.Router();
let spawnStreak = 0;
// GET /spawn-apple
router.get("/spawn-apple", (req, res) => {
  // Small chance normally
  let chance = 0.05;

  // Increase chance if no apple spawned in a while
  if (spawnStreak > 5) chance = 0.5;

  const shouldSpawn = Math.random() < chance;

  spawnStreak = shouldSpawn ? 0 : spawnStreak + 1;

  res.json({ spawn: shouldSpawn, streak: spawnStreak });
});

module.exports = router;