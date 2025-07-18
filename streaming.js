const express = require('express');
const fs = require('fs');
const app = express();
const PORT = 3000;

// Open a write stream for continuous appending
const audioStream = fs.createWriteStream('audio.raw', { flags: 'a' });

app.post('/upload', (req, res) => {
  req.on('data', chunk => {
    audioStream.write(chunk);
  });
  req.on('end', () => {
    res.sendStatus(200);
  });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});