const express = require('express');
const path = require('path');
const geoip = require('geoip-lite');
const http = require('http');
const https = require('https');
require('dotenv').config();

const { pool, getPool } = require('./db');
const setupWebSocket = require('./websocket');

const requireHTTPS = require('./middleware/requireHTTPS');
const app = express();
const PORT = process.env.PORT || 3000;

// Force HTTPS in production
if (process.env.NODE_ENV === 'production') {
    app.use(requireHTTPS);
}

// Enable trust proxy for Heroku/Render
app.enable('trust proxy');

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Routes
const { router: clickRoutes } = require('./routes/clickRoutes');
const boostRoutes = require('./routes/boostRoutes');
const missileRoutes = require('./routes/missileRoutes');
const SpawnRoute = require('./routes/spawnRoutes');
const challengeRoutes = require('./routes/challengeRoutes');
const countryRoutes = require('./routes/countryRoutes');

app.use(express.json()); // Add middleware to parse JSON bodies
app.use(clickRoutes);
app.use(boostRoutes);
app.use(missileRoutes);
app.use(SpawnRoute);
app.use(challengeRoutes);
app.use(countryRoutes);
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

    await pool.query(`
      CREATE TABLE IF NOT EXISTS country_challenges (
        id SERIAL PRIMARY KEY,
        challenger_country TEXT NOT NULL,
        challenged_country TEXT NOT NULL,
        bet_amount INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        winner_country TEXT,
        FOREIGN KEY (challenger_country) REFERENCES country_clicks(country_code),
        FOREIGN KEY (challenged_country) REFERENCES country_clicks(country_code)
      );
    `);
  } catch (err) {
    console.error("Error initializing tables:", err);
  }
}

const { setupWSHandlers } = require('./middleware/wsHandler');

// Create appropriate server based on environment
let server;
if (process.env.NODE_ENV === 'production') {
  // In production, the hosting platform (like Render) handles HTTPS
  server = http.createServer(app);
} else {
  // In development, use regular HTTP
  server = http.createServer(app);
}

const { wss, broadcast } = setupWebSocket(server);

// Make broadcast available globally
global.broadcast = broadcast;

// Setup WebSocket handlers
setupWSHandlers(wss);

// Start server with proper error handling
async function startServer() {
  try {
    // Ensure database connection works
    await getPool();
    
    // Initialize tables
    await initializeTables();
    
    // Start listening
    server.listen(PORT, () => {
      const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
      console.log(`Server running at ${protocol}://localhost:${PORT}`);
    });

    // Handle server errors
    server.on('error', (err) => {
      console.error('Server error:', err);
      process.exit(1);
    });

  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

// Start the server
startServer();
