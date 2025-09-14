const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const geoip = require('geoip-lite');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Conexión a PostgreSQL (Render -> External URL)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // necesario para Render
  }
});

app.use(express.static(path.join(__dirname, 'public')));

// Inicializa tablas si no existen
async function initializeCounterTable() {
  try {
    // Tabla principal de contador global
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

    // Tabla para contar por país
    await pool.query(`
      CREATE TABLE IF NOT EXISTS country_clicks (
        id SERIAL PRIMARY KEY,
        country_code TEXT NOT NULL UNIQUE,
        clicks INTEGER NOT NULL DEFAULT 1
      );
    `);
  } catch (err) {
    console.error("Error inicializando tablas:", err);
  }
}

// Ruta principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.get('/boostbutton', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/powers.html'));
});
let boostActive = false;
let boostTimer = null;
let boostExpiresAt = null; // timestamp de expiración

app.get('/boost', async (req, res) => {
  boostActive = true;



  // Resetear si ya había un temporizador
  if (boostTimer) clearTimeout(boostTimer);

  // 60 segundos de duración
  const duration = 60 * 1000;
  boostExpiresAt = Date.now() + duration;

  boostTimer = setTimeout(() => {
    boostActive = false;
    boostExpiresAt = null;
    console.log("Boost expired automatically after 1 minute");
  }, duration);

  res.json({
    boost: "ON",
    expiresIn: Math.floor(duration / 1000) // segundos
  });
});
// Ruta de click: actualiza el contador global y por país
app.get('/clicked', async (req, res) => {
  let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  if (ip.includes(',')) ip = ip.split(',')[0];
  if (ip.includes('::ffff:')) ip = ip.split('::ffff:')[1];

  const geo = geoip.lookup(ip);
  const countryCode = geo?.country || 'XX';

  console.log(`Click desde IP: ${ip} (País: ${countryCode})`);

  try {
    // Si boost está activo, sumar 2 en lugar de 1
    const increment = boostActive ? 2 : 1;

    // Global
    await pool.query('UPDATE counter SET count = count + $1 WHERE id = 1', [increment]);

    // Por país
    await pool.query(`
      INSERT INTO country_clicks (country_code, clicks)
      VALUES ($1, $2)
      ON CONFLICT (country_code)
      DO UPDATE SET clicks = country_clicks.clicks + $2;
    `, [countryCode, increment]);

    const result = await pool.query('SELECT count FROM counter WHERE id = 1');
    const newCount = result.rows[0].count;

    res.send(`thanks for clicking. Total: ${newCount}`);
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
    console.error('cant find counter :', err);
    res.status(500).send('cant find counter file');
  }
});


app.get('/paises', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT country_code, clicks
      FROM country_clicks
      ORDER BY clicks DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener clicks por país:', err);
    res.status(500).send('Error al obtener clicks por país');
  }
});
app.get('/boost-status', (req, res) => {
  if (boostActive && boostExpiresAt) {
    const expiresIn = Math.max(0, Math.floor((boostExpiresAt - Date.now()) / 1000));
    res.json({ boost: "ON", expiresIn });
  } else {
    res.json({ boost: "OFF", expiresIn: 0 });
  }
});

// Iniciar servidor
app.listen(PORT, async () => {
  await initializeCounterTable();
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
