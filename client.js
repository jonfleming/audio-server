const fs = require('fs');
const path = require('path');
const http = require('http');

const filePath = path.join(__dirname, 'english.wav');
const options = {
  hostname: 'localhost',
  port: 3000, // Change if your server uses a different port
  path: '/upload', // Change if your server expects a different endpoint
  method: 'POST',
  headers: {
    'Content-Type': 'audio/wav',
    'Content-Disposition': 'attachment; filename="engllish.wav"'
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  res.setEncoding('utf8');
  res.on('data', (chunk) => {
    console.log(`BODY: ${chunk}`);
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

const readStream = fs.createReadStream(filePath);
readStream.on('error', (err) => {
  console.error('File error:', err);
  req.end();
});
readStream.pipe(req);
readStream.on('end', () => {
  req.end();
});
