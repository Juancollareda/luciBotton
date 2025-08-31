const express = require('express');
const path = require('path');
const geoip = require('geoip-lite');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

// File where we store data
const DATA_FILE = path.join(__dirname, 'data.txt');

// Load data from file or set defaults
function loadData() {
  if (fs.existsSync(DATA_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    } catch (e) {
      console.error("Error parsing data.txt, resetting...");
    }
  }
  return { count: 0, countries: {} };
}

// Save data to file
function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data));
}

// Global in-memory data
let data = loadData();

// Ruta principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Ruta de click
app.get('/clicked', (req, res) => {
  let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  if (ip.includes(',')) ip = ip.split(',')[0];
  if (ip.includes('::ffff:')) ip = ip.split('::ffff:')[1];

  const geo = geoip.lookup(ip);
  const countryCode = geo?.country || 'XX';

  console.log(`Click desde IP: ${ip} (País: ${countryCode})`);

  // Update counters
  data.count += 1;
  data.countries[countryCode] = (data.countries[countryCode] || 0) + 1;

  saveData(data);

  res.send(`thanks for clicking. Total: ${data.count}`);
});

// Ruta de contador global
app.get('/count', (req, res) => {
  res.send(`Button has been clicked ${data.count} times`);
});

// Ruta clicks por país
app.get('/paises', (req, res) => {
  const sorted = Object.entries(data.countries)
    .map(([country, clicks]) => ({ country, clicks }))
    .sort((a, b) => b.clicks - a.clicks);

  res.json(sorted);
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
