const express = require('express');
const { setBoostActive } = require('./clickRoutes');

const router = express.Router();

let boostTimer = null;
let boostExpiresAt = null;

const ADMIN_PASSWORD = "supersecret123123ret123123";

router.get('/boost', (req, res) => {
  setBoostActive(true);
  if (boostTimer) clearTimeout(boostTimer);
  const duration = 60 * 1000;
  boostExpiresAt = Date.now() + duration;

  boostTimer = setTimeout(() => {
    setBoostActive(false);
    boostExpiresAt = null;
    console.log("Boost expired automatically after 1 minute");
  }, duration);

  res.json({ boost: "ON", expiresIn: Math.floor(duration / 1000) });
});
router.get('/boostbutton', (req, res) => {
  const password = req.query.password;
  if (password === ADMIN_PASSWORD) {
    // Send powers.html from public folder
    res.redirect('/powers.html');
  } else {
    res.status(403).send('Access denied. Wrong password.');
  }
});
router.get('/boost-status', (req, res) => {
  if (boostExpiresAt) {
    const expiresIn = Math.max(0, Math.floor((boostExpiresAt - Date.now()) / 1000));
    res.json({ boost: expiresIn > 0 ? "ON" : "OFF", expiresIn });
  } else {
    res.json({ boost: "OFF", expiresIn: 0 });
  }
});

module.exports = router;
