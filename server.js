// server.js
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Home route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// API endpoint for button click
app.get('/clicked', (req, res) => {
  console.log("Button was clicked!");
  res.send("Thanks for clicking!");
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
