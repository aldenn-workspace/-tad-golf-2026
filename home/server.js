const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3455;

http.createServer((req, res) => {
  const file = path.join(__dirname, 'index.html');
  fs.readFile(file, (err, content) => {
    if (err) { res.writeHead(500); res.end('Error'); return; }
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(content);
  });
}).listen(PORT, '127.0.0.1', () => console.log(`🦉 Aldenn Home → http://localhost:${PORT}`));
