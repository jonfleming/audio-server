const fs = require('fs');
const path = require('path');
const http = require('http');

async function streamWavPCMToServer(file, serverUrl, chunkSize = 512) {
  try {
    const arrayBuffer = file.buffer.slice(44, file.byteLength);
    const dataView = new DataView(arrayBuffer);

    const pcmData = new Uint8Array(arrayBuffer, 44, arrayBuffer.byteLength - 44);
    
    for (let i = 0; i < pcmData.length; i += chunkSize) {
      const chunk = pcmData.slice(i, i + chunkSize);
      
      const response = await fetch(serverUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream'
        },
        body: chunk
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
    }    
  } catch (error) {
    console.error('Error streaming WAV file:', error);
    throw error;
  }
}

function main() {
    const filePath = path.join(__dirname, 'music.wav');
    console.log(`Streaming WAV file from: ${filePath}`);
    const buffer = fs.readFileSync(filePath);
    streamWavPCMToServer(buffer, `http://localhost:3000/upload`);
}

main()