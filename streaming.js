const express = require('express');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

const RAW_FILE = 'raw-audio';
const WAV_FILE = 'output-audio';
const uploadDir = path.join(__dirname, 'uploads');
const SAMPLE_RATE = 16000;
const NUM_CHANNELS = 1;
const BITS_PER_SAMPLE = 16;
const tenSecondsOfData = SAMPLE_RATE * 10 * NUM_CHANNELS * BITS_PER_SAMPLE / 8;

let audioStream = null;
let filesize = 0;
let outputId = 0;
let recordingStarted = false;

console.log(`tenSecondsOfData: ${tenSecondsOfData} bytes`);

// Create WebSocket server
const wss = new WebSocket.Server({ port: PORT, path: '/' });

// Ensure the uploads directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');

  if (!recordingStarted) {
    startRecording(outputId);
    recordingStarted = true;
  }

  ws.on('message', (data) => {
    if (Buffer.isBuffer(data)) {
      // Handle binary audio data
      audioStream.write(data);
      filesize += data.length;
      console.log(`Received ${data.length} bytes of data`);

      if (filesize > tenSecondsOfData) {
        // Stop the current recording
        closeStream();
        console.log(`Recording ${outputId} ended.`);
        convertRawToWav(outputId++);

        // Start a new recording
        startRecording(outputId);
      }
    } else {
      // Handle text messages (e.g., stop command)
      const message = data.toString();
      if (message === 'stop') {
        closeStream();
        console.log(`Recording ${outputId} ended due to stop command.`);
        convertRawToWav(outputId++);
        recordingStarted = false;
        ws.send('stop'); // Acknowledge stop
      }
    }
  });

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
    if (recordingStarted) {
      closeStream();
      console.log(`Recording ${outputId} ended due to disconnect.`);
      convertRawToWav(outputId++);
      recordingStarted = false;
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

function closeStream() {
  if (audioStream) {
    audioStream.end();
    audioStream.close();
    audioStream = null;
  }
}

function startRecording(id) {
  filesize = 0;
  const rawFilePath = path.join(uploadDir, `${RAW_FILE}-${id}.raw`);
  audioStream = fs.createWriteStream(rawFilePath, { flags: 'a' });
  console.log(`Recording ${id} started...`);
}

function convertRawToWav(id) {
  const rawFilePath = path.join(uploadDir, `${RAW_FILE}-${id}.raw`);
  if (!fs.existsSync(rawFilePath) || fs.statSync(rawFilePath).size === 0) {
    console.log(`No data to convert for ${rawFilePath}`);
    return;
  }

  const rawData = fs.readFileSync(rawFilePath);
  const filename = path.join(uploadDir, `${WAV_FILE}-${id}.wav`);
  const wavWriter = fs.createWriteStream(filename);

  writeWavHeader(wavWriter, rawData.length);
  wavWriter.write(rawData);
  wavWriter.end(() => {
    console.log(`WAV file written to ${filename}`);
    // Optionally delete raw file to save space
    fs.unlinkSync(rawFilePath);
  });
}

function writeWavHeader(writer, dataLength) {
  const header = Buffer.alloc(44);

  // ChunkID "RIFF"
  header.write('RIFF', 0);
  // ChunkSize (file size - 8)
  header.writeUInt32LE(36 + dataLength, 4);
  // Format "WAVE"
  header.write('WAVE', 8);
  // Subchunk1ID "fmt "
  header.write('fmt ', 12);
  // Subchunk1Size (16 for PCM)
  header.writeUInt32LE(16, 16);
  // AudioFormat (1 for PCM)
  header.writeUInt16LE(1, 20);
  // NumChannels
  header.writeUInt16LE(NUM_CHANNELS, 22);
  // SampleRate
  header.writeUInt32LE(SAMPLE_RATE, 24);
  // ByteRate = SampleRate * NumChannels * BitsPerSample/8
  header.writeUInt32LE(SAMPLE_RATE * NUM_CHANNELS * BITS_PER_SAMPLE / 8, 28);
  // BlockAlign = NumChannels * BitsPerSample/8
  header.writeUInt16LE(NUM_CHANNELS * BITS_PER_SAMPLE / 8, 32);
  // BitsPerSample
  header.writeUInt16LE(BITS_PER_SAMPLE, 34);
  // Subchunk2ID "data"
  header.write('data', 36);
  // Subchunk2Size (data length)
  header.writeUInt32LE(dataLength, 40);

  writer.write(header);
}

console.log(`WebSocket server listening on ws://localhost:${PORT}`);