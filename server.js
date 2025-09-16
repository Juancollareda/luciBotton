const express = require('express');
const path = require('path');
const geoip = require('geoip-lite');
require('dotenv').config();

const pool = require('./db');  // ✅ use the shared pool

const app = express();
const PORT = process.env.PORT || 3000;

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Routes
const { router: clickRoutes } = require('./routes/clickRoutes');
const boostRoutes = require('./routes/boostRoutes');
const missileRoutes = require('./routes/missileRoutes');
const SpawnRoute = require('./routes/spawnRoutes'); // Import the spawn route

app.use(clickRoutes);
app.use(boostRoutes);
app.use(missileRoutes);
app.use(SpawnRoute); // Use the spawn route
async function initializeTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS counter (
        id SERIAL PRIMARY KEY,
        count INTEGER NOT NULL DEFAULT 0
      );
    `);
    const result = await pool.query('SELECT * FROM counter');
    if (result.rows.length === 0) await pool.query('INSERT INTO counter (count) VALUES (0)');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS country_clicks (
        id SERIAL PRIMARY KEY,
        country_code TEXT NOT NULL UNIQUE,
        clicks INTEGER NOT NULL DEFAULT 1
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS country_missiles (
        id SERIAL PRIMARY KEY,
        country_code TEXT NOT NULL UNIQUE,
        last_missile TIMESTAMP
      );
    `);
  } catch (err) {
    console.error("Error initializing tables:", err);
  }
}

app.listen(PORT, async () => {
  await initializeTables();
  console.log(`Server running at http://localhost:${PORT}`);
});
