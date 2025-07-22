const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

const COUNT_FILE = path.join(__dirname, 'count.txt');
let counter = 0;


if (fs.existsSync(COUNT_FILE)) {
  const savedCount = fs.readFileSync(COUNT_FILE, 'utf8');
  counter = parseInt(savedCount, 10) || 0;
}

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.get('/clicked', (req, res) => {
  console.log("Button was clicked!");
  counter += 1;

  fs.writeFileSync(COUNT_FILE, counter.toString(), 'utf8');
  console.log(`Button clicked ${counter} times`);
  res.send(`Thanks for clicking! ${counter}`);
});


app.get('/count', (req, res) => {
  res.send(`Button has been clicked ${counter} times`);
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
