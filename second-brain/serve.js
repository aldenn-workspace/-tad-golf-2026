const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = 3457;

app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.get('/api/files', (req, res) => {
  const base = __dirname;
  const folders = ['inbox','articles','faith','family','people','morning-briefings'];
  const result = {};
  folders.forEach(f => {
    const fp = path.join(base, f);
    if (fs.existsSync(fp)) {
      result[f] = fs.readdirSync(fp).filter(x => x.endsWith('.md') || x.endsWith('.txt'));
    }
  });
  res.json(result);
});

app.get('/api/read', (req, res) => {
  const file = req.query.file;
  if (!file || file.includes('..')) return res.status(400).json({ error: 'invalid' });
  const fp = path.join(__dirname, file);
  if (!fs.existsSync(fp)) return res.status(404).json({ error: 'not found' });
  res.json({ content: fs.readFileSync(fp, 'utf8'), file });
});

app.listen(PORT, '127.0.0.1', () => console.log(`Second Brain running at http://localhost:${PORT}`));
