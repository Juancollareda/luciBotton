// server.js
const { count } = require('console');
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;
counter = 0;
// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Home route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});

// API endpoint for button click
app.get('/clicked', (req, res) => {
  console.log("Button was clicked!");
  counter += 1;
  console.log(`Button clicked ${counter} times`);
  res.send("Thanks for clicking!");
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
