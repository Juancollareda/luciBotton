const express = require('express');
const path = require('path');
const { Pool } = require('pg');
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

// Inicializa la tabla si no existe
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
      console.log("Tabla inicializada con count = 0");
    }
  } catch (err) {
    console.error("Error inicializando tabla:", err);
  }
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.get('/clicked', async (req, res) => {
  // Obtener IP real del visitante
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  console.log(`Click recibido desde IP: ${ip}`);

  try {
    await pool.query('UPDATE counter SET count = count + 1 WHERE id = 1');
    const result = await pool.query('SELECT count FROM counter WHERE id = 1');
    const newCount = result.rows[0].count;
    res.send(`Thanks for clicking! ${newCount}`);
  } catch (err) {
    console.error('Error al actualizar contador:', err);
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

app.listen(PORT, async () => {
  await initializeCounterTable();
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
