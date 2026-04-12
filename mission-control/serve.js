'use strict';

const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// ── Config ────────────────────────────────────────────────────────────────────
const PORT     = process.env.PORT || 3456;
const PASSWORD = process.env.MC_PASSWORD || 'PVOnward26!';
const DB_PATH  = path.join(__dirname, 'data', 'mission.db');
const PUBLIC   = path.join(__dirname, 'public');
const DOWNLOADS = path.join(__dirname, 'downloads');

// ── Database ──────────────────────────────────────────────────────────────────
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── App ───────────────────────────────────────────────────────────────────────
const app = express();
app.use(cookieParser());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Multer for file uploads
const upload = multer({ dest: path.join(__dirname, 'uploads') });
fs.mkdirSync(path.join(__dirname, 'uploads'), { recursive: true });
fs.mkdirSync(DOWNLOADS, { recursive: true });

// ── Auth middleware ───────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  if (req.cookies.mc_auth === 'yes') return next();
  if (req.path === '/login' || req.path === '/api/login') return next();
  // For API routes, return 401
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Unauthorized' });
  // Redirect to login page
  res.redirect('/login');
}

app.use(requireAuth);

// ── Login routes ──────────────────────────────────────────────────────────────
app.get('/login', (req, res) => {
  if (req.cookies.mc_auth === 'yes') return res.redirect('/');
  res.send(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Mission Control – Login</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0f172a; color: #e2e8f0; font-family: system-ui, sans-serif;
         display: flex; align-items: center; justify-content: center; min-height: 100vh; }
  .card { background: #1e293b; border-radius: 12px; padding: 2rem; width: 360px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.5); }
  h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
  p { color: #94a3b8; font-size: 0.875rem; margin-bottom: 1.5rem; }
  input { width: 100%; padding: 0.75rem; background: #0f172a; border: 1px solid #334155;
          border-radius: 8px; color: #e2e8f0; font-size: 1rem; margin-bottom: 1rem; }
  button { width: 100%; padding: 0.75rem; background: #3b82f6; border: none;
           border-radius: 8px; color: white; font-size: 1rem; cursor: pointer; font-weight: 600; }
  button:hover { background: #2563eb; }
  .err { color: #f87171; font-size: 0.875rem; margin-top: 0.5rem; display: none; }
</style></head>
<body>
  <div class="card">
    <h1>🚀 Mission Control</h1>
    <p>PromusVC Operations Hub</p>
    <form id="f">
      <input type="password" id="pw" placeholder="Password" autofocus>
      <button type="submit">Enter</button>
      <div class="err" id="err">Wrong password</div>
    </form>
  </div>
  <script>
    document.getElementById('f').addEventListener('submit', async e => {
      e.preventDefault();
      const r = await fetch('/api/login', { method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ password: document.getElementById('pw').value }) });
      if (r.ok) { window.location.href = '/'; }
      else { document.getElementById('err').style.display = 'block'; }
    });
  </script>
</body></html>`);
});

app.post('/api/login', (req, res) => {
  const { password } = req.body;
  if (password === PASSWORD) {
    res.cookie('mc_auth', 'yes', { httpOnly: true, maxAge: 90 * 24 * 3600 * 1000 });
    return res.json({ ok: true });
  }
  res.status(401).json({ error: 'Wrong password' });
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('mc_auth');
  res.json({ ok: true });
});

// ── Static files ──────────────────────────────────────────────────────────────
app.use(express.static(PUBLIC));

// ── Downloads ─────────────────────────────────────────────────────────────────
app.use('/downloads', express.static(DOWNLOADS));

// ═══════════════════════════════════════════════════════════════════════════════
// API Routes
// ═══════════════════════════════════════════════════════════════════════════════

// ── System ────────────────────────────────────────────────────────────────────
app.get('/api/system/stats', (req, res) => {
  try {
    const tables = ['tasks','calendar_events','promus_deals','incoming_deals',
                    'companies','people','pv5_lps','todos','podcasts','articles',
                    'travel_trips','legal_reviews','research_history','riley_notes'];
    const stats = {};
    for (const t of tables) {
      try { stats[t] = db.prepare(`SELECT COUNT(*) as c FROM ${t}`).get().c; }
      catch { stats[t] = 0; }
    }
    res.json({ ok: true, counts: stats, uptime: process.uptime(), ts: new Date().toISOString() });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── Tasks ─────────────────────────────────────────────────────────────────────
app.get('/api/tasks', (req, res) => {
  const { status, assignee } = req.query;
  let q = 'SELECT * FROM tasks WHERE 1=1';
  const p = [];
  if (status)   { q += ' AND status = ?';   p.push(status); }
  if (assignee) { q += ' AND assignee = ?'; p.push(assignee); }
  q += ' ORDER BY priority DESC, created DESC';
  res.json(db.prepare(q).all(...p));
});

app.post('/api/tasks', (req, res) => {
  const { title, notes='', status='todo', assignee='aldenn', priority='normal' } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  const r = db.prepare(`INSERT INTO tasks (title,notes,status,assignee,priority) VALUES (?,?,?,?,?)`)
    .run(title, notes, status, assignee, priority);
  res.json({ id: r.lastInsertRowid, ok: true });
});

app.put('/api/tasks/:id', (req, res) => {
  const fields = ['title','notes','status','assignee','priority'];
  const updates = []; const vals = [];
  for (const f of fields) { if (req.body[f] !== undefined) { updates.push(`${f}=?`); vals.push(req.body[f]); } }
  if (!updates.length) return res.status(400).json({ error: 'no fields' });
  updates.push(`updated=datetime('now')`);
  vals.push(req.params.id);
  db.prepare(`UPDATE tasks SET ${updates.join(',')} WHERE id=?`).run(...vals);
  res.json({ ok: true });
});

app.delete('/api/tasks/:id', (req, res) => {
  db.prepare('DELETE FROM tasks WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// ── Todos ─────────────────────────────────────────────────────────────────────
app.get('/api/todos', (req, res) => {
  const { list, status } = req.query;
  let q = 'SELECT * FROM todos WHERE 1=1';
  const p = [];
  if (list)   { q += ' AND list=?';   p.push(list); }
  if (status) { q += ' AND status=?'; p.push(status); }
  q += " ORDER BY CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END, created DESC";
  res.json(db.prepare(q).all(...p));
});

app.post('/api/todos', (req, res) => {
  const { list='personal', text, notes='', priority='normal', status='open', due_date='' } = req.body;
  if (!text) return res.status(400).json({ error: 'text required' });
  const r = db.prepare(`INSERT INTO todos (list,text,notes,priority,status,due_date) VALUES (?,?,?,?,?,?)`)
    .run(list, text, notes, priority, status, due_date);
  res.json({ id: r.lastInsertRowid, ok: true });
});

app.put('/api/todos/:id', (req, res) => {
  const fields = ['list','text','notes','priority','status','due_date'];
  const updates = []; const vals = [];
  for (const f of fields) { if (req.body[f] !== undefined) { updates.push(`${f}=?`); vals.push(req.body[f]); } }
  if (!updates.length) return res.status(400).json({ error: 'no fields' });
  updates.push(`updated=datetime('now')`);
  vals.push(req.params.id);
  db.prepare(`UPDATE todos SET ${updates.join(',')} WHERE id=?`).run(...vals);
  res.json({ ok: true });
});

app.delete('/api/todos/:id', (req, res) => {
  db.prepare('DELETE FROM todos WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// ── Calendar / Events ─────────────────────────────────────────────────────────
app.get('/api/calendar', (req, res) => {
  res.json(db.prepare('SELECT * FROM calendar_events ORDER BY scheduled ASC').all());
});

app.post('/api/calendar', (req, res) => {
  const { title, description='', event_type='cron', scheduled, recurrence='', status='active', source='manual' } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  const r = db.prepare(`INSERT INTO calendar_events (title,description,event_type,scheduled,recurrence,status,source) VALUES (?,?,?,?,?,?,?)`)
    .run(title, description, event_type, scheduled, recurrence, status, source);
  res.json({ id: r.lastInsertRowid, ok: true });
});

app.put('/api/calendar/:id', (req, res) => {
  const fields = ['title','description','event_type','scheduled','recurrence','status'];
  const updates = []; const vals = [];
  for (const f of fields) { if (req.body[f] !== undefined) { updates.push(`${f}=?`); vals.push(req.body[f]); } }
  if (!updates.length) return res.status(400).json({ error: 'no fields' });
  vals.push(req.params.id);
  db.prepare(`UPDATE calendar_events SET ${updates.join(',')} WHERE id=?`).run(...vals);
  res.json({ ok: true });
});

app.delete('/api/calendar/:id', (req, res) => {
  db.prepare('DELETE FROM calendar_events WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// ── Pipeline (promus_deals) ───────────────────────────────────────────────────
app.get('/api/pipeline', (req, res) => {
  const { status, owner, stage } = req.query;
  let q = 'SELECT * FROM promus_deals WHERE 1=1';
  const p = [];
  if (status) { q += ' AND status=?'; p.push(status); }
  if (owner)  { q += ' AND owner=?';  p.push(owner); }
  if (stage)  { q += ' AND stage=?';  p.push(stage); }
  q += ' ORDER BY updated DESC';
  res.json(db.prepare(q).all(...p));
});

app.post('/api/pipeline', (req, res) => {
  const { company, stage='', owner='mike', status='sourcing', probability=10,
          check_size_usd=0, target_close_date='', next_step='', memo_status='not-started',
          notes='', source='manual', sector='', lead='', city='', valuation='',
          round_stage='', investors='', amount_raising='' } = req.body;
  if (!company) return res.status(400).json({ error: 'company required' });
  const r = db.prepare(`INSERT INTO promus_deals 
    (company,stage,owner,status,probability,check_size_usd,target_close_date,next_step,
     memo_status,notes,source,sector,lead,city,valuation,round_stage,investors,amount_raising)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(company,stage,owner,status,probability,check_size_usd,target_close_date,next_step,
         memo_status,notes,source,sector,lead,city,valuation,round_stage,investors,amount_raising);
  res.json({ id: r.lastInsertRowid, ok: true });
});

app.put('/api/pipeline/:id', (req, res) => {
  const fields = ['company','stage','owner','status','probability','check_size_usd',
                  'target_close_date','next_step','memo_status','notes','sector','lead',
                  'city','valuation','round_stage','investors','amount_raising','research_summary'];
  const updates = []; const vals = [];
  for (const f of fields) { if (req.body[f] !== undefined) { updates.push(`${f}=?`); vals.push(req.body[f]); } }
  if (!updates.length) return res.status(400).json({ error: 'no fields' });
  updates.push(`updated=datetime('now')`);
  vals.push(req.params.id);
  db.prepare(`UPDATE promus_deals SET ${updates.join(',')} WHERE id=?`).run(...vals);
  res.json({ ok: true });
});

app.delete('/api/pipeline/:id', (req, res) => {
  db.prepare('DELETE FROM promus_deals WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// Drew research for a deal
app.post('/api/pipeline/:id/research', async (req, res) => {
  try {
    const deal = db.prepare('SELECT * FROM promus_deals WHERE id=?').get(req.params.id);
    if (!deal) return res.status(404).json({ error: 'deal not found' });
    const drewAnalyst = require('./drew-analyst');
    const result = await drewAnalyst(deal.company, deal);
    if (result) {
      db.prepare(`UPDATE promus_deals SET research_summary=?, updated=datetime('now') WHERE id=?`)
        .run(result, req.params.id);
    }
    res.json({ ok: true, summary: result });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Team ──────────────────────────────────────────────────────────────────────
app.get('/api/team', (req, res) => {
  res.json(db.prepare('SELECT * FROM promus_team ORDER BY name').all());
});

app.post('/api/team', (req, res) => {
  const { name, handle, role='', focus='', status='active', capacity_pct=100 } = req.body;
  if (!name || !handle) return res.status(400).json({ error: 'name and handle required' });
  const r = db.prepare(`INSERT INTO promus_team (name,handle,role,focus,status,capacity_pct) VALUES (?,?,?,?,?,?)`)
    .run(name, handle, role, focus, status, capacity_pct);
  res.json({ id: r.lastInsertRowid, ok: true });
});

app.put('/api/team/:id', (req, res) => {
  const fields = ['name','handle','role','focus','status','capacity_pct'];
  const updates = []; const vals = [];
  for (const f of fields) { if (req.body[f] !== undefined) { updates.push(`${f}=?`); vals.push(req.body[f]); } }
  if (!updates.length) return res.status(400).json({ error: 'no fields' });
  updates.push(`updated=datetime('now')`);
  vals.push(req.params.id);
  db.prepare(`UPDATE promus_team SET ${updates.join(',')} WHERE id=?`).run(...vals);
  res.json({ ok: true });
});

// ── Incoming Deals ────────────────────────────────────────────────────────────
app.get('/api/incoming-deals', (req, res) => {
  const { status } = req.query;
  let q = 'SELECT * FROM incoming_deals WHERE 1=1';
  const p = [];
  if (status) { q += ' AND status=?'; p.push(status); }
  q += ' ORDER BY intake_date DESC, created DESC';
  res.json(db.prepare(q).all(...p));
});

app.post('/api/incoming-deals', (req, res) => {
  const { deal_name, city='', amount_raising='', valuation='', industry='',
          originated_by='', inbound_type='Other', source_email='', source_channel='manual',
          intake_date='', notes='', status='new', round_stage='', investors='',
          company_name='', email_content='' } = req.body;
  if (!deal_name) return res.status(400).json({ error: 'deal_name required' });
  const r = db.prepare(`INSERT INTO incoming_deals 
    (deal_name,city,amount_raising,valuation,industry,originated_by,inbound_type,
     source_email,source_channel,intake_date,notes,status,round_stage,investors,company_name,email_content)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(deal_name,city,amount_raising,valuation,industry,originated_by,inbound_type,
         source_email,source_channel,intake_date||new Date().toISOString().split('T')[0],
         notes,status,round_stage,investors,company_name,email_content);
  res.json({ id: r.lastInsertRowid, ok: true });
});

app.put('/api/incoming-deals/:id', (req, res) => {
  const fields = ['deal_name','city','amount_raising','valuation','industry','originated_by',
                  'inbound_type','notes','status','round_stage','investors','research_summary'];
  const updates = []; const vals = [];
  for (const f of fields) { if (req.body[f] !== undefined) { updates.push(`${f}=?`); vals.push(req.body[f]); } }
  if (!updates.length) return res.status(400).json({ error: 'no fields' });
  updates.push(`updated=datetime('now')`);
  vals.push(req.params.id);
  db.prepare(`UPDATE incoming_deals SET ${updates.join(',')} WHERE id=?`).run(...vals);
  res.json({ ok: true });
});

app.delete('/api/incoming-deals/:id', (req, res) => {
  db.prepare('DELETE FROM incoming_deals WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// Promote incoming deal to pipeline
app.post('/api/incoming-deals/:id/promote', (req, res) => {
  const deal = db.prepare('SELECT * FROM incoming_deals WHERE id=?').get(req.params.id);
  if (!deal) return res.status(404).json({ error: 'not found' });
  const r = db.prepare(`INSERT INTO promus_deals (company,stage,source,notes,sector,city,valuation,round_stage,investors,amount_raising,inbound_type,intake_date,email_content) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(deal.company_name||deal.deal_name,'initial screening','incoming',deal.notes,
         deal.industry,deal.city,deal.valuation,deal.round_stage,deal.investors,
         deal.amount_raising,deal.inbound_type,deal.intake_date,deal.email_content);
  const newId = r.lastInsertRowid;
  db.prepare(`UPDATE incoming_deals SET status='promoted', promoted_deal_id=?, updated=datetime('now') WHERE id=?`)
    .run(newId, req.params.id);
  res.json({ ok: true, deal_id: newId });
});

// Email sync
app.post('/api/incoming-deals/sync-email', async (req, res) => {
  try {
    const syncEmail = require('./sync-email');
    const count = await syncEmail(db);
    res.json({ ok: true, synced: count });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Research ──────────────────────────────────────────────────────────────────
app.get('/api/research', (req, res) => {
  res.json(db.prepare('SELECT * FROM research_history ORDER BY created DESC LIMIT 100').all());
});

app.post('/api/research', async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'query required' });
  const ins = db.prepare(`INSERT INTO research_history (query, status) VALUES (?, 'pending')`);
  const r = ins.run(query);
  const id = r.lastInsertRowid;
  res.json({ id, ok: true, status: 'pending' });
  // Run async
  try {
    const drewAnalyst = require('./drew-analyst');
    const result = await drewAnalyst(query);
    db.prepare(`UPDATE research_history SET result=?, status='done' WHERE id=?`).run(result||'', id);
  } catch(e) {
    db.prepare(`UPDATE research_history SET result=?, status='error' WHERE id=?`).run(e.message, id);
  }
});

// ── Legal Reviews ─────────────────────────────────────────────────────────────
app.get('/api/legal', (req, res) => {
  res.json(db.prepare('SELECT * FROM legal_reviews ORDER BY created DESC').all());
});

app.post('/api/legal', upload.single('file'), async (req, res) => {
  const { doc_name, doc_text='' } = req.body;
  if (!doc_name) return res.status(400).json({ error: 'doc_name required' });
  let filePath = '';
  if (req.file) {
    filePath = req.file.path;
  }
  const r = db.prepare(`INSERT INTO legal_reviews (doc_name, doc_text, status, file_path) VALUES (?, ?, 'pending', ?)`)
    .run(doc_name, doc_text, filePath);
  const id = r.lastInsertRowid;
  res.json({ id, ok: true });
  // Async Tate review
  try {
    const tate = require('./tate-legal');
    const result = await tate(doc_name, doc_text || (filePath ? fs.readFileSync(filePath,'utf8') : ''));
    db.prepare(`UPDATE legal_reviews SET result=?, status='done' WHERE id=?`).run(result||'', id);
  } catch(e) {
    db.prepare(`UPDATE legal_reviews SET result=?, status='error' WHERE id=?`).run(e.message, id);
  }
});

app.delete('/api/legal/:id', (req, res) => {
  db.prepare('DELETE FROM legal_reviews WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// ── PV5 LPs ───────────────────────────────────────────────────────────────────
app.get('/api/pv5', (req, res) => {
  const { status } = req.query;
  let q = 'SELECT * FROM pv5_lps WHERE 1=1';
  const p = [];
  if (status) { q += ' AND status=?'; p.push(status); }
  q += ' ORDER BY status_rank ASC, name ASC';
  res.json(db.prepare(q).all(...p));
});

app.post('/api/pv5', (req, res) => {
  const { affinity_entity_id, name, status='', investor_type='', aum=0, owner='',
          previous_funds='', investment_potential='', fund2_commitment=0,
          close_date='', notes='', location='', domain='' } = req.body;
  if (!affinity_entity_id || !name) return res.status(400).json({ error: 'affinity_entity_id and name required' });
  const r = db.prepare(`INSERT OR REPLACE INTO pv5_lps 
    (affinity_entity_id,name,status,investor_type,aum,owner,previous_funds,
     investment_potential,fund2_commitment,close_date,notes,location,domain)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(affinity_entity_id,name,status,investor_type,aum,owner,previous_funds,
         investment_potential,fund2_commitment,close_date,notes,location,domain);
  res.json({ id: r.lastInsertRowid, ok: true });
});

app.put('/api/pv5/:id', (req, res) => {
  const fields = ['name','status','status_rank','investor_type','aum','owner','previous_funds',
                  'investment_potential','fund2_commitment','close_date','notes','location','domain'];
  const updates = []; const vals = [];
  for (const f of fields) { if (req.body[f] !== undefined) { updates.push(`${f}=?`); vals.push(req.body[f]); } }
  if (!updates.length) return res.status(400).json({ error: 'no fields' });
  updates.push(`updated=datetime('now')`);
  vals.push(req.params.id);
  db.prepare(`UPDATE pv5_lps SET ${updates.join(',')} WHERE id=?`).run(...vals);
  res.json({ ok: true });
});

app.post('/api/pv5/sync', async (req, res) => {
  try {
    const syncPv5 = require('./sync-pv5');
    const result = await syncPv5(db);
    res.json({ ok: true, ...result });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Companies ─────────────────────────────────────────────────────────────────
app.get('/api/companies', (req, res) => {
  const { relationship, sector, search } = req.query;
  let q = 'SELECT * FROM companies WHERE 1=1';
  const p = [];
  if (relationship) { q += ' AND relationship=?'; p.push(relationship); }
  if (sector)       { q += ' AND sector=?';       p.push(sector); }
  if (search)       { q += ' AND (name LIKE ? OR sector LIKE ? OR hq LIKE ?)'; p.push(`%${search}%`,`%${search}%`,`%${search}%`); }
  q += ' ORDER BY name ASC';
  res.json(db.prepare(q).all(...p));
});

app.post('/api/companies', (req, res) => {
  const { name, domain='', sector='', stage='', hq='', description='',
          relationship='prospect', source='manual' } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const r = db.prepare(`INSERT INTO companies (name,domain,sector,stage,hq,description,relationship,source) VALUES (?,?,?,?,?,?,?,?)`)
    .run(name,domain,sector,stage,hq,description,relationship,source);
  res.json({ id: r.lastInsertRowid, ok: true });
});

app.put('/api/companies/:id', (req, res) => {
  const fields = ['name','domain','sector','stage','hq','description','relationship',
                  'notes','drew_summary','portfolio_status','pv_funds','fair_value',
                  'hayley_summary','affinity_notes'];
  const updates = []; const vals = [];
  for (const f of fields) { if (req.body[f] !== undefined) { updates.push(`${f}=?`); vals.push(req.body[f]); } }
  if (!updates.length) return res.status(400).json({ error: 'no fields' });
  updates.push(`updated=datetime('now')`);
  vals.push(req.params.id);
  db.prepare(`UPDATE companies SET ${updates.join(',')} WHERE id=?`).run(...vals);
  res.json({ ok: true });
});

app.get('/api/companies/:id', (req, res) => {
  const c = db.prepare('SELECT * FROM companies WHERE id=?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'not found' });
  const interactions = db.prepare('SELECT * FROM interactions WHERE company_id=? ORDER BY date DESC LIMIT 20').all(req.params.id);
  res.json({ ...c, interactions });
});

// ── People ────────────────────────────────────────────────────────────────────
app.get('/api/people', (req, res) => {
  const { relationship, company_id, search } = req.query;
  let q = 'SELECT * FROM people WHERE 1=1';
  const p = [];
  if (relationship) { q += ' AND relationship=?'; p.push(relationship); }
  if (company_id)   { q += ' AND company_id=?';   p.push(company_id); }
  if (search)       { q += ' AND (name LIKE ? OR company LIKE ? OR email LIKE ?)'; p.push(`%${search}%`,`%${search}%`,`%${search}%`); }
  q += ' ORDER BY name ASC';
  res.json(db.prepare(q).all(...p));
});

app.post('/api/people', (req, res) => {
  const { name, email='', company='', company_id=null, role='', relationship='contact', notes='' } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const r = db.prepare(`INSERT INTO people (name,email,company,company_id,role,relationship,notes) VALUES (?,?,?,?,?,?,?)`)
    .run(name,email,company,company_id,role,relationship,notes);
  res.json({ id: r.lastInsertRowid, ok: true });
});

app.put('/api/people/:id', (req, res) => {
  const fields = ['name','email','company','company_id','role','relationship','notes','last_meeting'];
  const updates = []; const vals = [];
  for (const f of fields) { if (req.body[f] !== undefined) { updates.push(`${f}=?`); vals.push(req.body[f]); } }
  if (!updates.length) return res.status(400).json({ error: 'no fields' });
  updates.push(`updated=datetime('now')`);
  vals.push(req.params.id);
  db.prepare(`UPDATE people SET ${updates.join(',')} WHERE id=?`).run(...vals);
  res.json({ ok: true });
});

// ── Interactions ──────────────────────────────────────────────────────────────
app.get('/api/interactions', (req, res) => {
  const { company_id, person_id } = req.query;
  let q = 'SELECT * FROM interactions WHERE 1=1';
  const p = [];
  if (company_id) { q += ' AND company_id=?'; p.push(company_id); }
  if (person_id)  { q += ' AND person_id=?';  p.push(person_id); }
  q += ' ORDER BY date DESC LIMIT 50';
  res.json(db.prepare(q).all(...p));
});

app.post('/api/interactions', (req, res) => {
  const { company_id=null, person_id=null, type='meeting', title, date='', notes='' } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  const r = db.prepare(`INSERT INTO interactions (company_id,person_id,type,title,date,notes) VALUES (?,?,?,?,?,?)`)
    .run(company_id, person_id, type, title, date||new Date().toISOString().split('T')[0], notes);
  res.json({ id: r.lastInsertRowid, ok: true });
});

// ── Affinity ──────────────────────────────────────────────────────────────────
app.get('/api/affinity/search', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'q required' });
  try {
    const AffinityClient = require('./affinity-client');
    const client = new AffinityClient();
    const results = await client.searchOrganizations(q);
    res.json(results);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/affinity/lists', async (req, res) => {
  try {
    const AffinityClient = require('./affinity-client');
    const client = new AffinityClient();
    const lists = await client.getLists();
    res.json(lists);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/affinity/cache', (req, res) => {
  res.json(db.prepare('SELECT * FROM affinity_cache ORDER BY cached_at DESC').all());
});

// ── Travel ────────────────────────────────────────────────────────────────────
app.get('/api/travel', (req, res) => {
  res.json(db.prepare('SELECT * FROM travel_trips ORDER BY start_date ASC').all());
});

app.post('/api/travel', (req, res) => {
  const { name, start_date, end_date, primary_location, purpose='business',
          status='planned', attendees='', notes='', budget_usd=0 } = req.body;
  if (!name || !start_date || !end_date || !primary_location)
    return res.status(400).json({ error: 'name, start_date, end_date, primary_location required' });
  const r = db.prepare(`INSERT INTO travel_trips (name,start_date,end_date,primary_location,purpose,status,attendees,notes,budget_usd) VALUES (?,?,?,?,?,?,?,?,?)`)
    .run(name,start_date,end_date,primary_location,purpose,status,attendees,notes,budget_usd);
  res.json({ id: r.lastInsertRowid, ok: true });
});

app.put('/api/travel/:id', (req, res) => {
  const fields = ['name','start_date','end_date','primary_location','purpose','status','attendees','notes','budget_usd','research_notes'];
  const updates = []; const vals = [];
  for (const f of fields) { if (req.body[f] !== undefined) { updates.push(`${f}=?`); vals.push(req.body[f]); } }
  if (!updates.length) return res.status(400).json({ error: 'no fields' });
  updates.push(`updated=datetime('now')`);
  vals.push(req.params.id);
  db.prepare(`UPDATE travel_trips SET ${updates.join(',')} WHERE id=?`).run(...vals);
  res.json({ ok: true });
});

app.delete('/api/travel/:id', (req, res) => {
  db.prepare('DELETE FROM travel_trips WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// ── Podcasts ──────────────────────────────────────────────────────────────────
app.get('/api/podcasts', (req, res) => {
  const { status } = req.query;
  let q = 'SELECT * FROM podcasts WHERE 1=1';
  const p = [];
  if (status) { q += ' AND status=?'; p.push(status); }
  q += ' ORDER BY created DESC';
  res.json(db.prepare(q).all(...p));
});

app.post('/api/podcasts', (req, res) => {
  const { show_name, episode_title, guest='', host='', date_published='',
          duration_mins=0, url='', summary='', tags='', status='want-to-watch', mike_notes='' } = req.body;
  if (!show_name || !episode_title) return res.status(400).json({ error: 'show_name and episode_title required' });
  const r = db.prepare(`INSERT INTO podcasts (show_name,episode_title,guest,host,date_published,duration_mins,url,summary,tags,status,mike_notes) VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
    .run(show_name,episode_title,guest,host,date_published,duration_mins,url,summary,tags,status,mike_notes);
  res.json({ id: r.lastInsertRowid, ok: true });
});

app.put('/api/podcasts/:id', (req, res) => {
  const fields = ['show_name','episode_title','guest','host','date_published','duration_mins',
                  'url','summary','key_takeaways','tags','status','mike_notes'];
  const updates = []; const vals = [];
  for (const f of fields) { if (req.body[f] !== undefined) { updates.push(`${f}=?`); vals.push(req.body[f]); } }
  if (!updates.length) return res.status(400).json({ error: 'no fields' });
  updates.push(`updated=datetime('now')`);
  vals.push(req.params.id);
  db.prepare(`UPDATE podcasts SET ${updates.join(',')} WHERE id=?`).run(...vals);
  res.json({ ok: true });
});

app.delete('/api/podcasts/:id', (req, res) => {
  db.prepare('DELETE FROM podcasts WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// ── Articles ──────────────────────────────────────────────────────────────────
app.get('/api/articles', (req, res) => {
  const { status } = req.query;
  let q = 'SELECT * FROM articles WHERE 1=1';
  const p = [];
  if (status) { q += ' AND status=?'; p.push(status); }
  q += ' ORDER BY created DESC';
  res.json(db.prepare(q).all(...p));
});

app.post('/api/articles', (req, res) => {
  const { title, author='', source='', url='', date_published='',
          summary='', key_takeaways='', mike_notes='', tags='', status='saved' } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  const r = db.prepare(`INSERT INTO articles (title,author,source,url,date_published,summary,key_takeaways,mike_notes,tags,status) VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .run(title,author,source,url,date_published,summary,key_takeaways,mike_notes,tags,status);
  res.json({ id: r.lastInsertRowid, ok: true });
});

app.put('/api/articles/:id', (req, res) => {
  const fields = ['title','author','source','url','date_published','summary','key_takeaways','mike_notes','tags','status'];
  const updates = []; const vals = [];
  for (const f of fields) { if (req.body[f] !== undefined) { updates.push(`${f}=?`); vals.push(req.body[f]); } }
  if (!updates.length) return res.status(400).json({ error: 'no fields' });
  updates.push(`updated=datetime('now')`);
  vals.push(req.params.id);
  db.prepare(`UPDATE articles SET ${updates.join(',')} WHERE id=?`).run(...vals);
  res.json({ ok: true });
});

app.delete('/api/articles/:id', (req, res) => {
  db.prepare('DELETE FROM articles WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// ── ROI Log ───────────────────────────────────────────────────────────────────
app.get('/api/roi', (req, res) => {
  const rows = db.prepare('SELECT * FROM roi_log ORDER BY created DESC LIMIT 200').all();
  const totals = db.prepare('SELECT SUM(mins_saved) as mins, SUM(value_usd) as value, SUM(token_cost_usd) as cost FROM roi_log').get();
  res.json({ rows, totals });
});

app.post('/api/roi', (req, res) => {
  const { agent='Alden', category='General', description, mins_saved=0, token_cost_usd=0, value_usd=0 } = req.body;
  if (!description) return res.status(400).json({ error: 'description required' });
  const r = db.prepare(`INSERT INTO roi_log (agent,category,description,mins_saved,token_cost_usd,value_usd) VALUES (?,?,?,?,?,?)`)
    .run(agent,category,description,mins_saved,token_cost_usd,value_usd);
  res.json({ id: r.lastInsertRowid, ok: true });
});

// ── Riley Notes ───────────────────────────────────────────────────────────────
app.get('/api/riley', (req, res) => {
  res.json(db.prepare('SELECT * FROM riley_notes ORDER BY meeting_date DESC LIMIT 50').all());
});

app.get('/api/riley/:id', (req, res) => {
  const n = db.prepare('SELECT * FROM riley_notes WHERE id=?').get(req.params.id);
  if (!n) return res.status(404).json({ error: 'not found' });
  res.json(n);
});

// ── VC Knowledge ──────────────────────────────────────────────────────────────
app.get('/api/knowledge', (req, res) => {
  const { q } = req.query;
  let rows;
  if (q) {
    rows = db.prepare(`SELECT * FROM vc_knowledge WHERE title LIKE ? OR content LIKE ? OR tags LIKE ? ORDER BY created DESC LIMIT 20`)
      .all(`%${q}%`,`%${q}%`,`%${q}%`);
  } else {
    rows = db.prepare('SELECT * FROM vc_knowledge ORDER BY created DESC LIMIT 50').all();
  }
  res.json(rows);
});

app.post('/api/knowledge', (req, res) => {
  const { title, content, source='manual', tags='' } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'title and content required' });
  const r = db.prepare(`INSERT INTO vc_knowledge (title,content,source,tags) VALUES (?,?,?,?)`)
    .run(title,content,source,tags);
  res.json({ id: r.lastInsertRowid, ok: true });
});

// ── Project Decisions & Blockers ──────────────────────────────────────────────
app.get('/api/decisions', (req, res) => {
  res.json(db.prepare('SELECT * FROM project_decisions ORDER BY created DESC').all());
});

app.post('/api/decisions', (req, res) => {
  const { project='general', decision, rationale='', decided_by='mike', status='active' } = req.body;
  if (!decision) return res.status(400).json({ error: 'decision required' });
  const r = db.prepare(`INSERT INTO project_decisions (project,decision,rationale,decided_by,status) VALUES (?,?,?,?,?)`)
    .run(project,decision,rationale,decided_by,status);
  res.json({ id: r.lastInsertRowid, ok: true });
});

app.get('/api/blockers', (req, res) => {
  res.json(db.prepare('SELECT * FROM project_blockers ORDER BY created DESC').all());
});

app.post('/api/blockers', (req, res) => {
  const { project='general', blocker, severity='medium', status='open', owner='mike', notes='' } = req.body;
  if (!blocker) return res.status(400).json({ error: 'blocker required' });
  const r = db.prepare(`INSERT INTO project_blockers (project,blocker,severity,status,owner,notes) VALUES (?,?,?,?,?,?)`)
    .run(project,blocker,severity,status,owner,notes);
  res.json({ id: r.lastInsertRowid, ok: true });
});

// ── VC Sessions ───────────────────────────────────────────────────────────────
app.get('/api/vc-sessions', (req, res) => {
  res.json(db.prepare('SELECT * FROM vc_sessions ORDER BY updated DESC').all());
});

// ═══════════════════════════════════════════════════════════════════════════════
// Additional API route aliases (path variants)
// ═══════════════════════════════════════════════════════════════════════════════

// ── PV5 aliases ───────────────────────────────────────────────────────────────
app.get('/api/pv5/summary', (req, res) => {
  try {
    const total = db.prepare('SELECT COUNT(*) as c FROM pv5_lps').get().c;
    const stages = db.prepare('SELECT status, COUNT(*) as count, SUM(fund2_commitment) as total_commitment FROM pv5_lps GROUP BY status ORDER BY COUNT(*) DESC').all();
    const committed = db.prepare("SELECT SUM(fund2_commitment) as total FROM pv5_lps WHERE status='Committed'").get();
    res.json({ total, stages, total_committed: committed?.total || 0 });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/pv5/lps', (req, res) => {
  const { status, search } = req.query;
  let q = 'SELECT * FROM pv5_lps WHERE 1=1';
  const p = [];
  if (status) { q += ' AND status=?'; p.push(status); }
  if (search) { q += ' AND (name LIKE ? OR location LIKE ? OR owner LIKE ? OR investor_type LIKE ?)'; p.push(`%${search}%`,`%${search}%`,`%${search}%`,`%${search}%`); }
  q += ' ORDER BY status_rank ASC, name ASC';
  res.json(db.prepare(q).all(...p));
});

// ── Pipeline aliases ───────────────────────────────────────────────────────────
app.get('/api/pipeline/deals', (req, res) => {
  const { status, stage, owner, search } = req.query;
  let q = 'SELECT * FROM promus_deals WHERE 1=1';
  const p = [];
  if (status) { q += ' AND status=?'; p.push(status); }
  if (stage)  { q += ' AND stage=?';  p.push(stage); }
  if (owner)  { q += ' AND owner=?';  p.push(owner); }
  if (search) { q += ' AND (company LIKE ? OR sector LIKE ? OR notes LIKE ?)'; p.push(`%${search}%`,`%${search}%`,`%${search}%`); }
  q += ' ORDER BY updated DESC';
  res.json(db.prepare(q).all(...p));
});

app.get('/api/pipeline/summary', (req, res) => {
  try {
    const total = db.prepare('SELECT COUNT(*) as c FROM promus_deals').get().c;
    const by_stage = db.prepare('SELECT stage, COUNT(*) as count FROM promus_deals GROUP BY stage ORDER BY COUNT(*) DESC').all();
    const by_status = db.prepare('SELECT status, COUNT(*) as count FROM promus_deals GROUP BY status ORDER BY COUNT(*) DESC').all();
    const totals = db.prepare('SELECT SUM(check_size_usd) as total_check, AVG(probability) as avg_prob FROM promus_deals').get();
    res.json({ total, by_stage, by_status, total_check_size: totals?.total_check || 0, avg_probability: totals?.avg_prob || 0 });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── Travel alias ───────────────────────────────────────────────────────────────
app.get('/api/travel/trips', (req, res) => {
  const { status } = req.query;
  let q = 'SELECT * FROM travel_trips WHERE 1=1';
  const p = [];
  if (status) { q += ' AND status=?'; p.push(status); }
  q += ' ORDER BY start_date ASC';
  res.json(db.prepare(q).all(...p));
});

// ── System alias ───────────────────────────────────────────────────────────────
app.get('/api/system', (req, res) => {
  try {
    const tables = ['tasks','calendar_events','promus_deals','incoming_deals',
                    'companies','people','pv5_lps','todos','podcasts','articles',
                    'travel_trips','legal_reviews','research_history','riley_notes'];
    const counts = {};
    for (const t of tables) {
      try { counts[t] = db.prepare(`SELECT COUNT(*) as c FROM ${t}`).get().c; }
      catch { counts[t] = 0; }
    }
    res.json({ ok: true, counts, uptime: process.uptime(), ts: new Date().toISOString() });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── Crons ──────────────────────────────────────────────────────────────────────
app.get('/api/crons', (req, res) => {
  try {
    const { execSync } = require('child_process');
    let output = '';
    try {
      output = execSync('openclaw cron list 2>/dev/null', { encoding: 'utf8', timeout: 5000, shell: '/bin/zsh', env: { ...process.env, PATH: process.env.PATH + ':/opt/homebrew/bin:/usr/local/bin' } });
    } catch(e) { output = e.stdout || e.message || ''; }
    try { res.json(JSON.parse(output)); }
    catch { res.json({ raw: output.trim(), crons: [] }); }
  } catch(e) { res.status(500).json({ error: e.message, crons: [] }); }
});

// ── Memory files ───────────────────────────────────────────────────────────────
app.get('/api/memory/files', (req, res) => {
  try {
    const home = process.env.HOME || '/Users/mini';
    const wsDir = path.join(home, '.openclaw', 'workspace');
    const memDir = path.join(wsDir, 'memory');
    const files = [];
    if (fs.existsSync(memDir)) {
      fs.readdirSync(memDir)
        .filter(f => f.endsWith('.md') || f.endsWith('.json'))
        .sort().reverse()
        .forEach(f => {
          const full = path.join(memDir, f);
          const stat = fs.statSync(full);
          files.push({ name: f, path: `memory/${f}`, size: stat.size, modified: stat.mtime });
        });
    }
    ['MEMORY.md','SOUL.md','USER.md','TOOLS.md','AGENTS.md','IDENTITY.md'].forEach(f => {
      const full = path.join(wsDir, f);
      if (fs.existsSync(full)) {
        const stat = fs.statSync(full);
        files.push({ name: f, path: f, size: stat.size, modified: stat.mtime });
      }
    });
    res.json(files);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── Todos by list (path param alias) ──────────────────────────────────────────
app.get('/api/todos/:list', (req, res) => {
  const { status } = req.query;
  let q = 'SELECT * FROM todos WHERE list=?';
  const p = [req.params.list];
  if (status) { q += ' AND status=?'; p.push(status); }
  q += " ORDER BY CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END, created DESC";
  res.json(db.prepare(q).all(...p));
});

// ── Affinity extended routes ───────────────────────────────────────────────────
app.get('/api/affinity/company/:name', async (req, res) => {
  try {
    const AffinityClient = require('./affinity-client');
    const client = new AffinityClient();
    const orgs = await client.searchOrganizations(req.params.name);
    if (!orgs || !orgs.length) return res.json({ found: false, name: req.params.name, orgs: [] });
    const org = orgs[0];
    let notes = [];
    try { notes = await client.getNotes(org.id, { limit: 10 }); } catch {}
    let interactions = [];
    try { interactions = await client.getInteractions(org.id); } catch {}
    res.json({ found: true, org, notes, interactions });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/affinity/notes', async (req, res) => {
  const { opportunity_id, org_id } = req.query;
  const id = opportunity_id || org_id;
  if (!id) return res.status(400).json({ error: 'opportunity_id or org_id required' });
  try {
    const AffinityClient = require('./affinity-client');
    const client = new AffinityClient();
    const notes = await client.getNotes(id);
    res.json(notes);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/affinity/lp-contacts/:id', async (req, res) => {
  try {
    const AffinityClient = require('./affinity-client');
    const client = new AffinityClient();
    const fields = await client.getFieldValues(req.params.id);
    res.json(fields);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/affinity/people/:org_id', async (req, res) => {
  try {
    const AffinityClient = require('./affinity-client');
    const client = new AffinityClient();
    const interactions = await client.getInteractions(req.params.org_id);
    res.json(interactions);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── Catch-all SPA ─────────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  const indexPath = path.join(PUBLIC, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Mission Control: public/index.html not found');
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Mission Control running on http://localhost:${PORT}`);
});

module.exports = app;
