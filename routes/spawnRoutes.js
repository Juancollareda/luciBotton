const express = require('express');
const geoip = require('geoip-lite');
const pool = require('../db');
const getIP = require('../utils/getIP');

const router = express.Router();

// GET /spawn-apple
router.get("/spawn-apple", (req, res) => {
  // Here you decide if an apple should spawn
  // You could use random chance, DB condition, or game logic

  const shouldSpawn = Math.random() < 0.1; // 10% chance to spawn

  res.json({ spawn: shouldSpawn });
});

module.exports = router;