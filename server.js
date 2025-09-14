const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const geoip = require('geoip-lite');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // necesario para Render
});

app.use(express.static(path.join(__dirname, 'public')));

async function initializeCounterTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS counter (
        id SERIAL PRIMARY KEY,
        count INTEGER NOT NULL DEFAULT 0
      );
    `);

    const result = await pool.query('SELECT * FROM counter');
    if (result.rows.length === 0) {
      await pool.query('INSERT INTO counter (count) VALUES (0)');
      console.log("Tabla 'counter' inicializada con count = 0");
    }

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
    console.error("Error inicializando tablas:", err);
  }
}

const ADMIN_PASSWORD = "supersecret123123ret123123";

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.get('/boostbutton', (req, res) => {
  const password = req.query.password;
  if (password === ADMIN_PASSWORD) {
    res.sendFile(path.join(__dirname, 'public/powers.html'));
  } else {
    res.status(403).send('Access denied. Wrong password.');
  }
});

let boostActive = false;
let boostTimer = null;
let boostExpiresAt = null;

app.get('/boost', async (req, res) => {
  boostActive = true;
  if (boostTimer) clearTimeout(boostTimer);
  const duration = 60 * 1000;
  boostExpiresAt = Date.now() + duration;

  boostTimer = setTimeout(() => {
    boostActive = false;
    boostExpiresAt = null;
    console.log("Boost expired automatically after 1 minute");
  }, duration);

  res.json({ boost: "ON", expiresIn: Math.floor(duration / 1000) });
});

function getIP(req) {
  let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  if (ip.includes(',')) ip = ip.split(',')[0];
  if (ip.includes('::ffff:')) ip = ip.split('::ffff:')[1];
  return ip;
}

app.get('/clicked', async (req, res) => {
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
    console.error('Error al actualizar:', err);
    res.status(500).send('Error al actualizar');
  }
});

app.get('/count', async (req, res) => {
  try {
    const result = await pool.query('SELECT count FROM counter WHERE id = 1');
    res.send(`Button has been clicked ${result.rows[0].count} times`);
  } catch (err) {
    console.error(err);
    res.status(500).send('cant find counter');
  }
});

app.get('/paises', async (req, res) => {
  try {
    const result = await pool.query('SELECT country_code, clicks FROM country_clicks ORDER BY clicks DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al obtener clicks por país');
  }
});

app.get('/boost-status', (req, res) => {
  if (boostActive && boostExpiresAt) {
    const expiresIn = Math.max(0, Math.floor((boostExpiresAt - Date.now()) / 1000));
    res.json({ boost: "ON", expiresIn });
  } else res.json({ boost: "OFF", expiresIn: 0 });
});

app.delete('/erase-country', async (req, res) => {
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

app.patch('/adjust-click', async (req, res) => {
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

// Missile endpoints remain unchanged
// ...
app.post('/missile', async (req, res) => {
  let ip = getIP(req);
  const geo = geoip.lookup(ip);
  let countryCode = geo?.country || 'XX';

  // Allow admin override target
  if (req.query.target) {
  countryCode = req.query.target.toUpperCase();
}

  let amount = parseInt(req.query.amount);
  if (isNaN(amount) || amount <= 0) return res.status(400).send('Invalid amount');

  try {
    const countryRes = await pool.query(
      'SELECT clicks FROM country_clicks WHERE country_code = $1',
      [countryCode]
    );
    if (!countryRes.rows.length) return res.status(404).send(`No clicks recorded for ${countryCode}`);

    const { clicks } = countryRes.rows[0];

    const missileRes = await pool.query(
      'SELECT last_missile FROM country_missiles WHERE country_code = $1',
      [countryCode]
    );

    const now = new Date();
    if (missileRes.rows.length > 0 && missileRes.rows[0].last_missile) {
      const last = new Date(missileRes.rows[0].last_missile);
      if ((now - last) < 24*60*60*1000) {
        return res.status(403).send(`Country ${countryCode} can only launch a missile once per day.`);
      }
    }

    const newClicks = Math.max(0, clicks - amount);
    await pool.query('UPDATE country_clicks SET clicks = $1 WHERE country_code = $2', [newClicks, countryCode]);

    const diff = clicks - newClicks;
    if (diff > 0) {
      await pool.query('UPDATE counter SET count = count - $1 WHERE id = 1', [diff]);
    }

    await pool.query(`
      INSERT INTO country_missiles (country_code, last_missile)
      VALUES ($1, $2)
      ON CONFLICT (country_code) DO UPDATE SET last_missile = $2
    `, [countryCode, now]);

    res.send(`Missile applied! ${diff} clicks subtracted from ${countryCode}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error applying missile');
  }
});
app.get('/missile-status', async (req, res) => {
  try {
    let countryCode = req.query.target ? req.query.target.toUpperCase() : geoip.lookup(getIP(req))?.country || 'XX';

    const missileRes = await pool.query(
      'SELECT last_missile FROM country_missiles WHERE country_code = $1',
      [countryCode]
    );

    const now = new Date();

    if (!missileRes.rows.length || !missileRes.rows[0].last_missile) {
      return res.json({ canLaunch: true });
    }

    const last = new Date(missileRes.rows[0].last_missile);
    const diff = now - last;

    if (diff >= 24*60*60*1000) {
      res.json({ canLaunch: true });
    } else {
      const hours = Math.floor((24*60*60*1000 - diff) / (1000*60*60));
      const minutes = Math.floor(((24*60*60*1000 - diff) % (1000*60*60)) / (1000*60));
      res.json({ canLaunch: false, hours, minutes });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ canLaunch: false });
  }
});
// --- FIXED reset-missile endpoint ---
app.post('/reset-missile', async (req, res) => {
  const { password, country_code } = req.query;
  if (password !== ADMIN_PASSWORD) return res.status(403).send('Access denied.');

  try {
    const code = country_code?.toUpperCase() || geoip.lookup(getIP(req))?.country || 'XX';
    // Ensure row exists
    await pool.query(`
      INSERT INTO country_missiles (country_code, last_missile)
      VALUES ($1, NULL)
      ON CONFLICT (country_code) DO UPDATE SET last_missile = NULL
    `, [code]);

    res.send(`Missile cooldown for ${code} has been reset.`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error resetting missile cooldown.');
  }
});

app.listen(PORT, async () => {
  await initializeCounterTable();
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
