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

// Ruta de click: actualiza el contador global y por país
app.get('/clicked', async (req, res) => {
  // Obtener IP real y limpiar
  let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  if (ip.includes(',')) ip = ip.split(',')[0]; // quedarse con la primera
  if (ip.includes('::ffff:')) ip = ip.split('::ffff:')[1]; // IPv4 en formato IPv6

  const geo = geoip.lookup(ip);
  const countryCode = geo?.country || 'XX'; // XX si no se puede determinar

  console.log(`Click desde IP: ${ip} (País: ${countryCode})`);

  try {
    // Suma al contador global
    await pool.query('UPDATE counter SET count = count + 1 WHERE id = 1');

    // Suma al contador por país
    await pool.query(`
      INSERT INTO country_clicks (country_code, clicks)
      VALUES ($1, 1)
      ON CONFLICT (country_code)
      DO UPDATE SET clicks = country_clicks.clicks + 1;
    `, [countryCode]);

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
    console.error('Error al obtener contador:', err);
    res.status(500).send('Error al obtener contador');
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

// Iniciar servidor
app.listen(PORT, async () => {
  await initializeCounterTable();
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
