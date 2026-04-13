const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const { db, tasks, calendar, vc, pipeline, team, incomingDeals, podcasts, articles, roi, todos, travel, research } = require('./db');
const { spawn } = require('child_process');

const app = express();
const PORT = 3456;
const STARTED_AT = new Date();

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ── PASSWORD PROTECTION (for public Tailscale Funnel) ────────────────
const PASSWORD = 'PVOnward26!';

// Login endpoint (must be BEFORE auth middleware)
app.post('/login', (req, res) => {
  const pwd = req.body?.password || '';
  if (pwd === PASSWORD) {
    res.cookie('mc_auth', 'yes', {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: false,
      sameSite: 'strict'
    });
    return res.redirect('/');
  }
  // Wrong password — show form again with error
  res.status(401).send(getPasswordPage(true));
});

// Auth check middleware (must be BEFORE static files)
app.use((req, res, next) => {
  // Public endpoints (no auth required)
  if (req.path === '/login' || req.path.startsWith('/api/') || req.path.startsWith('/downloads/') || req.path.match(/\.(png|jpg|svg|ico|webp)$/i)) {
    return next();
  }
  
  // Check auth cookie for everything else
  if (req.cookies?.mc_auth === 'yes') {
    return next();
  }
  
  // Redirect root to password page
  if (req.path === '/' || req.path === '/index.html') {
    return res.send(getPasswordPage(false));
  }
  
  // Block everything else
  res.status(401).json({ error: 'Unauthorized' });
});

function getPasswordPage(showError) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mission Control — Login</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      background: white;
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      width: 100%;
      max-width: 340px;
    }
    h1 { 
      font-size: 28px;
      margin-bottom: 8px;
      color: #333;
      text-align: center;
    }
    .subtitle {
      font-size: 14px;
      color: #666;
      text-align: center;
      margin-bottom: 24px;
    }
    input {
      width: 100%;
      padding: 12px;
      font-size: 16px;
      border: 1px solid #ddd;
      border-radius: 6px;
      margin-bottom: 16px;
    }
    button {
      width: 100%;
      padding: 12px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
    }
    button:hover { background: #5568d3; }
    .error {
      color: #dc2626;
      font-size: 13px;
      margin-bottom: 16px;
      text-align: center;
      display: ${showError ? 'block' : 'none'};
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎙️ Mission Control</h1>
    <div class="subtitle">Enter password to continue</div>
    <div class="error">Incorrect password. Try again.</div>
    <form method="POST" action="/login">
      <input type="password" name="password" placeholder="Password" autofocus required>
      <button type="submit">Sign In</button>
    </form>
  </div>
</body>
</html>`;
}

app.use(express.static(path.join(__dirname, 'public')));
app.use('/legal-docs', express.static('/Users/mini/.openclaw/workspace/legal-docs'));

// ── HEALTH API ────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  try {
    db.prepare('SELECT 1 AS ok').get();
    const taskCount = db.prepare("SELECT COUNT(*) AS count FROM tasks").get().count;
    const eventCount = db.prepare("SELECT COUNT(*) AS count FROM calendar_events").get().count;
    const activeVcSessions = db.prepare("SELECT COUNT(*) AS count FROM vc_sessions WHERE status = 'active'").get().count;
    const openPipelineDeals = db.prepare("SELECT COUNT(*) AS count FROM promus_deals WHERE status NOT IN ('pass', 'closed')").get().count;
    const activeTeamMembers = db.prepare("SELECT COUNT(*) AS count FROM promus_team WHERE status = 'active'").get().count;

    res.json({
      status: 'ok',
      service: 'mission-control',
      uptimeSeconds: Math.floor((Date.now() - STARTED_AT.getTime()) / 1000),
      startedAt: STARTED_AT.toISOString(),
      checks: {
        sqlite: 'ok',
        tasks: taskCount,
        calendarEvents: eventCount,
        activeVcSessions,
        openPipelineDeals,
        activeTeamMembers
      }
    });
  } catch (e) {
    res.status(500).json({ status: 'error', service: 'mission-control', error: e.message });
  }
});

// ── TASKS API ─────────────────────────────────────────────────────────
app.get('/api/tasks', (req, res) => {
  res.json(tasks.all());
});

app.post('/api/tasks', (req, res) => {
  try {
    const task = tasks.create(req.body);
    res.json(task);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.put('/api/tasks/:id', (req, res) => {
  try {
    const task = tasks.update(parseInt(req.params.id), req.body);
    res.json(task);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/tasks/:id', (req, res) => {
  tasks.delete(parseInt(req.params.id));
  res.json({ ok: true });
});

// ── CALENDAR API ──────────────────────────────────────────────────────
app.get('/api/calendar', (req, res) => {
  res.json(calendar.all());
});

// Expand recurring events for a given month
app.get('/api/calendar/month', (req, res) => {
  const year  = parseInt(req.query.year)  || new Date().getFullYear();
  const month = parseInt(req.query.month) || new Date().getMonth() + 1;
  const daysInMonth = new Date(year, month, 0).getDate();
  const pad = n => String(n).padStart(2,'0');
  const monthStr = `${year}-${pad(month)}`;

  const all = calendar.all().filter(e => e.status !== 'deleted');
  const expanded = [];

  for (const ev of all) {
    const rec = ev.recurrence || '';
    if (rec === 'daily') {
      for (let d = 1; d <= daysInMonth; d++)
        expanded.push({ ...ev, date: `${monthStr}-${pad(d)}` });
    } else if (rec.startsWith('weekly:')) {
      const targetDow = parseInt(rec.split(':')[1]); // 0=Sun
      for (let d = 1; d <= daysInMonth; d++)
        if (new Date(year, month-1, d).getDay() === targetDow)
          expanded.push({ ...ev, date: `${monthStr}-${pad(d)}` });
    } else if (rec.startsWith('monthly:')) {
      const dom = parseInt(rec.split(':')[1]);
      if (dom <= daysInMonth)
        expanded.push({ ...ev, date: `${monthStr}-${pad(dom)}` });
    } else if (ev.scheduled) {
      if (ev.scheduled.startsWith(monthStr))
        expanded.push({ ...ev, date: ev.scheduled.slice(0,10) });
    }
  }

  expanded.sort((a,b) => a.date.localeCompare(b.date) || (a.time||'').localeCompare(b.time||''));
  res.json(expanded);
});

app.post('/api/calendar', (req, res) => {
  try {
    const ev = calendar.create(req.body);
    res.json(ev);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.put('/api/calendar/:id', (req, res) => {
  try {
    const ev = calendar.update(parseInt(req.params.id), req.body);
    res.json(ev);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/calendar/:id', (req, res) => {
  calendar.delete(parseInt(req.params.id));
  res.json({ ok: true });
});

// ── MEMORY API ────────────────────────────────────────────────────────
const fs   = require('fs');
const http = require('http');
const WORKSPACE = '/Users/mini/.openclaw/workspace';

function readMemoryFiles() {
  const files = [];

  // MEMORY.md
  const mainPath = path.join(WORKSPACE, 'MEMORY.md');
  if (fs.existsSync(mainPath)) {
    const stat = fs.statSync(mainPath);
    const content = fs.readFileSync(mainPath, 'utf8');
    const words = content.trim().split(/\s+/).filter(Boolean).length;
    files.push({ id: 'MEMORY', name: 'MEMORY.md', label: 'Long-Term Memory', date: stat.mtime.toISOString(), path: mainPath, type: 'longterm', size: stat.size, words });
  }

  // memory/YYYY-MM-DD.md daily files
  const memDir = path.join(WORKSPACE, 'memory');
  if (fs.existsSync(memDir)) {
    const daily = fs.readdirSync(memDir)
      .filter(f => f.endsWith('.md'))
      .sort()
      .reverse();
    for (const f of daily) {
      const fp = path.join(memDir, f);
      const stat = fs.statSync(fp);
      const content = fs.readFileSync(fp, 'utf8');
      const words = content.trim().split(/\s+/).filter(Boolean).length;
      files.push({ id: f.replace('.md',''), name: f, label: f.replace('.md',''), date: stat.mtime.toISOString(), path: fp, type: 'daily', size: stat.size, words });
    }
  }

  return files;
}

app.get('/api/memory/files', (req, res) => {
  try {
    res.json(readMemoryFiles().map(f => ({ ...f, path: undefined }))); // strip fs path
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/memory/content', (req, res) => {
  try {
    const { id } = req.query;
    const files = readMemoryFiles();
    const f = files.find(x => x.id === id);
    if (!f) return res.status(404).json({ error: 'not found' });
    const content = fs.readFileSync(f.path, 'utf8');
    res.json({ id: f.id, name: f.name, label: f.label, date: f.date, content });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/memory/search', (req, res) => {
  try {
    const q = (req.query.q || '').toLowerCase().trim();
    if (!q) return res.json([]);
    const files = readMemoryFiles();
    const results = [];
    for (const f of files) {
      const content = fs.readFileSync(f.path, 'utf8');
      const lines = content.split('\n');
      const hits = [];
      lines.forEach((line, i) => {
        if (line.toLowerCase().includes(q)) {
          hits.push({ line: i + 1, text: line.trim() });
        }
      });
      if (hits.length) results.push({ id: f.id, name: f.name, label: f.label, date: f.date, hits: hits.slice(0, 5), totalHits: hits.length });
    }
    res.json(results);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── CRONS API ────────────────────────────────────────────────────────
const OPENCLAW_DIR = '/Users/mini/.openclaw';

function humanSchedule(schedule) {
  if (!schedule) return 'Unknown';
  if (schedule.kind === 'cron') {
    const map = {
      '0 6 * * *': 'Daily 6:00 AM CT', '10 6 * * *': 'Daily 6:10 AM CT',
      '0 7 * * *': 'Daily 7:00 AM CT', '0 9 * * *': 'Daily 9:00 AM CT',
      '0 2 * * *': 'Daily 2:00 AM CT', '0 16 * * 5': 'Fridays 4:00 PM CT',
      '30 9 * * 6': 'Saturdays 9:30 AM CT', '0 9 * * 1': 'Mondays 9:00 AM CT',
    };
    return map[schedule.expr] || ('Cron: ' + schedule.expr);
  }
  if (schedule.kind === 'every') {
    const ms = schedule.everyMs;
    if (ms === 3600000) return 'Every 1 hour';
    if (ms === 1800000) return 'Every 30 min';
    if (ms === 259200000) return 'Every 3 days';
    return 'Every ' + Math.round(ms / 60000) + ' min';
  }
  return schedule.kind;
}

app.get('/api/crons', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(OPENCLAW_DIR, 'cron/jobs.json'), 'utf8'));
    const now = Date.now();
    const jobs = (data.jobs || []).map(job => ({
      id: job.id,
      name: job.name || job.id.slice(0, 8),
      enabled: job.enabled,
      schedule: humanSchedule(job.schedule),
      model: job.payload?.model || 'default',
      lastStatus: job.state?.lastStatus || null,
      lastRunAtMs: job.state?.lastRunAtMs || null,
      lastRunAgo: job.state?.lastRunAtMs ? Math.floor((now - job.state.lastRunAtMs) / 60000) : null,
      nextRunAtMs: job.state?.nextRunAtMs || null,
      nextRunInMin: job.state?.nextRunAtMs ? Math.floor((job.state.nextRunAtMs - now) / 60000) : null,
      consecutiveErrors: job.state?.consecutiveErrors || 0,
      lastError: job.state?.lastError || null,
      lastDurationMs: job.state?.lastDurationMs || null,
    }));
    res.json({ jobs, updatedAt: new Date().toISOString() });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── SYSTEM API ────────────────────────────────────────────────────────
const SERVICES = [
  { name: 'home',            url: 'http://localhost:3455' },
  { name: 'mission_control', url: 'http://localhost:3456/api/health' },
  { name: 'second_brain',    url: 'http://localhost:3457' },
  { name: 'tad_golf',        url: 'http://localhost:3458' },
  { name: 'nat_golf',        url: 'http://localhost:3459' },
  { name: 'whoop_tracker',   url: 'http://localhost:3461' },
];

function pingService(name, url, timeoutMs = 3000) {
  return new Promise((resolve) => {
    const start = Date.now();
    try {
      const u = new URL(url);
      const req = http.request({
        hostname: u.hostname,
        port: parseInt(u.port) || 80,
        path: u.pathname + (u.search || ''),
        method: 'GET',
        timeout: timeoutMs
      }, (resp) => {
        resp.resume();
        resolve({ name, ok: resp.statusCode < 400, status: resp.statusCode, latencyMs: Date.now() - start });
      });
      req.on('error', () => resolve({ name, ok: false, status: 0, latencyMs: Date.now() - start }));
      req.on('timeout', () => { req.destroy(); resolve({ name, ok: false, status: 0, latencyMs: timeoutMs }); });
      req.end();
    } catch(e) {
      resolve({ name, ok: false, status: 0, latencyMs: 0 });
    }
  });
}

app.get('/api/system', async (req, res) => {
  try {
    // Live pings — no stale files
    const results = await Promise.all(SERVICES.map(s => pingService(s.name, s.url)));
    const stackHealth = {
      generatedAt: new Date().toISOString(),
      pass: results.every(r => r.ok),
      counts: { passed: results.filter(r => r.ok).length, failed: results.filter(r => !r.ok).length, total: results.length },
      results
    };

    let sessionInfo = { main: null, finn: null };
    try {
      const sessions = JSON.parse(fs.readFileSync(path.join(OPENCLAW_DIR, 'agents/main/sessions/sessions.json'), 'utf8'));
      const mainSess = sessions['agent:main:main'];
      sessionInfo.main = mainSess ? { updatedAt: mainSess.updatedAt } : null;
    } catch(e) {}

    let cronSummary = { total: 0, enabled: 0, errors: 0 };
    try {
      const cronData = JSON.parse(fs.readFileSync(path.join(OPENCLAW_DIR, 'cron/jobs.json'), 'utf8'));
      cronSummary.total = (cronData.jobs || []).length;
      cronSummary.enabled = (cronData.jobs || []).filter(j => j.enabled).length;
      cronSummary.errors = (cronData.jobs || []).filter(j => (j.state?.consecutiveErrors || 0) > 0).length;
    } catch(e) {}

    res.json({
      gateway: { status: 'ok', port: 23547 },
      stackHealth,
      sessionInfo,
      cronSummary,
      serverUptimeSeconds: Math.floor((Date.now() - STARTED_AT.getTime()) / 1000),
      checkedAt: new Date().toISOString()
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── TODAY API ────────────────────────────────────────────────────────
// ── KNOWLEDGE BASE (compiled wiki) ────────────────
const WIKI_DIR = path.join(__dirname, '..', 'second-brain', 'compiled');

app.get('/api/wiki', (req, res) => {
  const fs = require('fs');
  if (!fs.existsSync(WIKI_DIR)) return res.json({ pages: [] });
  const pages = fs.readdirSync(WIKI_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => {
      const content = fs.readFileSync(path.join(WIKI_DIR, f), 'utf8');
      const title = content.split('\n').find(l => l.startsWith('#'))?.replace(/^#+\s*/, '') || f.replace('.md','');
      return { file: f, title, lines: content.split('\n').length };
    });
  res.json({ pages, compiledDir: 'second-brain/compiled/' });
});

app.get('/api/wiki/:file', (req, res) => {
  const fs = require('fs');
  const fp = path.join(WIKI_DIR, req.params.file);
  if (!fs.existsSync(fp)) return res.status(404).json({ error: 'Not found' });
  const content = fs.readFileSync(fp, 'utf8');
  const title = content.split('\n').find(l => l.startsWith('#'))?.replace(/^#+\s*/, '') || req.params.file;
  res.json({ title, content });
});

app.get('/api/today', async (req, res) => {
  try {
    const now = new Date();
    const tz = 'America/Chicago';
    const todayStr = now.toLocaleDateString('en-CA', { timeZone: tz }); // YYYY-MM-DD

    // Calendar events — show active recurring + any manual events for today
    const allEvents = db.prepare(`SELECT * FROM calendar_events WHERE status = 'active' AND (recurrence != '' OR source = 'manual') ORDER BY scheduled ASC LIMIT 8`).all();

    // Top open tasks (priority order: high first)
    const openTasks = db.prepare(`SELECT * FROM tasks WHERE status != 'done' ORDER BY
      CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, created DESC LIMIT 5`).all();

    // Next cron jobs today
    const cronsRaw = JSON.parse(require('fs').readFileSync('/Users/mini/.openclaw/cron/jobs.json', 'utf8'));
    const enabledCrons = (cronsRaw.jobs || []).filter(j => j.enabled !== false).slice(0, 5);

    // Whoop — latest recovery
    let whoop = null;
    try {
      const http = require('http');
      const whoopData = await new Promise((resolve, reject) => {
        http.get('http://127.0.0.1:3461/api/data', r => {
          let body = '';
          r.on('data', c => body += c);
          r.on('end', () => resolve(JSON.parse(body)));
        }).on('error', reject);
      });
      const recovery = (whoopData.recovery || []);
      if (recovery.length) {
        const latest = recovery[0];
        whoop = {
          date: latest.date,
          recovery: latest.recovery,
          rhr: latest.rhr,
          hrv: latest.hrv,
          isToday: latest.date === todayStr
        };
      }
    } catch(e) { /* whoop unavailable */ }

    // ROI this week
    const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().slice(0,10);
    const roiWeek = db.prepare(`SELECT COUNT(*) as count, SUM(mins_saved) as mins, SUM(token_cost_usd) as cost, SUM(value_usd) as value FROM roi_log WHERE date >= ?`).get(weekAgoStr);

    res.json({ date: todayStr, events: allEvents, tasks: openTasks, crons: enabledCrons, whoop, roiWeek });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── AGENTS INFO API ──────────────────────────────────────────────────
app.get('/api/agents-info', (req, res) => {
  try {
    // Read each agent's own sessions file
    let mainSessions = {}, finnSessions = {};
    try { mainSessions = JSON.parse(fs.readFileSync(path.join(OPENCLAW_DIR, 'agents/main/sessions/sessions.json'), 'utf8')); } catch(e) {}
    try { finnSessions = JSON.parse(fs.readFileSync(path.join(OPENCLAW_DIR, 'agents/finn/sessions/sessions.json'), 'utf8')); } catch(e) {}

    const agentDefs = [
      { id: 'main', name: 'Alden', emoji: '🦉', workspace: WORKSPACE,                  model: 'claude-sonnet-4-6', channel: 'Telegram', sessions: mainSessions },
      { id: 'finn', name: 'Finn',  emoji: '⭐', workspace: '/Users/mini/finn/workspace', model: 'claude-sonnet-4-6', channel: 'Slack',    sessions: finnSessions },
    ];

    const agents = agentDefs.map(def => {
      let soul = null;
      const soulPath = path.join(def.workspace, 'SOUL.md');
      if (fs.existsSync(soulPath)) soul = fs.readFileSync(soulPath, 'utf8');
      // Use the most recently updated session for this agent
      const sessionKeys = Object.keys(def.sessions).filter(k => k.startsWith(`agent:${def.id}:`) && !k.includes(':run:'));
      const lastUpdated = sessionKeys.reduce((best, k) => {
        const ts = def.sessions[k]?.updatedAt || 0;
        return ts > best ? ts : best;
      }, 0);
      return {
        id: def.id, name: def.name, emoji: def.emoji,
        model: def.model, channel: def.channel, workspace: def.workspace,
        soul, lastActive: lastUpdated || null, status: 'active'
      };
    });

    res.json(agents);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── FALLBACK ──────────────────────────────────────────────────────────
// ── VC COPILOT API (LEVEL 2) ─────────────────────────────────────────
app.get('/api/vc/knowledge', (req, res) => {
  res.json(vc.knowledgeAll());
});

app.post('/api/vc/knowledge', (req, res) => {
  try {
    const item = vc.knowledgeCreate(req.body || {});
    res.json(item);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/vc/analyze', (req, res) => {
  try {
    const { company = 'Unknown', stage = '', notes = '' } = req.body || {};
    const session = vc.sessionCreateOrGet({ company, stage });

    const lower = String(notes || '').toLowerCase();
    const evidence = vc.knowledgeSearch(company, 3);

    const scores = {
      Team: /(repeat founder|2nd time|ex-|domain expert|operator)/.test(lower) ? 8 : 6,
      Market: /(tam|category|billion|macro tailwind|expanding market)/.test(lower) ? 8 : 6,
      Product: /(live product|shipping|pilot|api|technical moat|integration)/.test(lower) ? 8 : 5,
      Traction: /(revenue|arr|growth|retention|pipeline|customers|paid)/.test(lower) ? 8 : 4,
      Moat: /(network effect|data moat|patent|distribution|switching cost)/.test(lower) ? 7 : 5,
    };

    const redFlags = [];
    if (!/(customer|pilot|design partner|paid)/.test(lower)) redFlags.push('Customer validation is thin.');
    if (!/(retention|churn|repeat)/.test(lower)) redFlags.push('Retention data is missing.');
    if (!/(competition|incumbent|alternative)/.test(lower)) redFlags.push('Competitive landscape is underspecified.');

    const signals = [];
    if (/(shipped|speed|iterate|weekly)/.test(lower)) signals.push('Strong product velocity signal.');
    if (/(customer pain|workflow|problem-first|obsess)/.test(lower)) signals.push('Founder framing is customer-centric.');
    if (/(capital efficient|frugal|burn)/.test(lower)) signals.push('Capital discipline signal present.');

    const questions = [
      'What is the non-obvious technical insight that creates enduring advantage?',
      'What is the strongest proof of pull from real buyers today?',
      'What would make this look obviously wrong in 12 months?'
    ];

    const thesis = `${company} (${stage || 'stage TBD'}) shows ${scores.Team >= 8 ? 'strong' : 'developing'} team quality and ${scores.Product >= 8 ? 'credible' : 'early'} product depth. Move fast on reference-backed traction and moat validation before conviction.`;

    vc.addMessage(session.id, 'user', notes);
    vc.addMessage(session.id, 'assistant', thesis);

    res.json({
      sessionId: session.id,
      thesis,
      scores,
      redFlags: redFlags.length ? redFlags : ['No major red flags detected yet.'],
      signals: signals.length ? signals : ['No strong founder signals detected yet.'],
      questions,
      evidence: evidence.map(e => ({ id: e.id, title: e.title, source: e.source, excerpt: String(e.content || '').slice(0, 180) }))
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/vc/session/:id', (req, res) => {
  const id = parseInt(req.params.id);
  res.json(vc.recentMessages(id, 10));
});

// ── PROMUS PIPELINE API (PHASE 4) ────────────────────────────────────
app.get('/api/pipeline/deals', (req, res) => {
  res.json(pipeline.all());
});

app.get('/api/pipeline/summary', (req, res) => {
  res.json(pipeline.summary());
});

app.post('/api/pipeline/deals', (req, res) => {
  try {
    const deal = pipeline.create(req.body || {});
    res.json(deal);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.put('/api/pipeline/deals/:id', (req, res) => {
  try {
    const deal = pipeline.update(parseInt(req.params.id, 10), req.body || {});
    res.json(deal);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/pipeline/deals/:id', (req, res) => {
  pipeline.delete(parseInt(req.params.id, 10));
  res.json({ ok: true });
});

// Drew research on a pipeline deal
const affinityClient = require('./affinity-client');

app.post('/api/pipeline/deals/:id/research', async (req, res) => {
  const deal = pipeline.get(parseInt(req.params.id, 10));
  if (!deal) return res.status(404).json({ error: 'Not found' });

  res.json({ ok: true, status: 'running', company: deal.company });

  // Run last30days + Affinity context + summarize in background
  const { spawn } = require('child_process');
  const scriptPath = '/Users/mini/.openclaw/skills/last30days/scripts/last30days.py';
  const proc = spawn('python3', [scriptPath, deal.company, '--quick'], {
    env: { ...process.env, PYTHONUNBUFFERED: '1' }, timeout: 240000,
  });
  let output = '';
  proc.stdout.on('data', d => { output += d.toString(); });
  proc.stderr.on('data', d => { output += d.toString(); });
  proc.on('close', async () => {
    const clean = output.replace(/\x1b\[[0-9;]*m/g, '').replace(/\x1b\[[0-9]*[A-Za-z]/g, '').trim();

    // Pull Affinity context in parallel
    let affinityContext = null;
    let affinitySection = '';
    try {
      affinityContext = await affinityClient.getCompanyContext(deal.company);
      if (affinityContext) {
        const parts = [];
        if (affinityContext.isPortfolio) parts.push('✅ Already in Promus portfolio');
        if (affinityContext.isActiveDeal) parts.push('🔄 Already in Active Deals pipeline');
        if (affinityContext.isPassed) parts.push('❌ Previously passed');
        if (affinityContext.funds?.length) parts.push(`Funds: ${affinityContext.funds.join(', ')}`);
        if (affinityContext.listMembership?.length) parts.push(`Lists: ${affinityContext.listMembership.map(l=>l.list).join(', ')}`);
        if (affinityContext.notes?.length) parts.push(`Prior notes: ${affinityContext.notes[0].content.substring(0,150)}`);
        if (parts.length) affinitySection = `\n\n**Affinity History:**\n${parts.map(p=>'• '+p).join('\n')}`;
      }
    } catch(e) { console.log('Affinity lookup failed:', e.message); }

    // Summarize with Claude
    let summary = clean.substring(0, 2000);
    try {
      const cr = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': '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', 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-haiku-4-5', max_tokens: 600,
          messages: [{ role: 'user', content: `You are Drew, analyst at Promus Ventures. Summarize this research on "${deal.company}" in 4-6 bullet points for a VC analyst. Focus on: funding history, team, market traction, red flags, competitors. Be direct.\n\n${affinitySection ? 'Affinity CRM context: ' + affinitySection + '\n\n' : ''}Research:\n${clean.substring(0, 3000)}` }]
        })
      });
      const cd = await cr.json();
      summary = (cd.content?.[0]?.text || summary) + affinitySection;
    } catch(e) {}

    // Save to pipeline deal notes
    const existingNotes = deal.notes || '';
    const timestamp = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const newNotes = existingNotes + (existingNotes ? '\n\n' : '') + `--- Drew Research (${timestamp}) ---\n${summary}`;
    db.prepare('UPDATE promus_deals SET notes = ?, research_summary = ?, updated = datetime(\'now\') WHERE id = ?').run(newNotes, summary, deal.id);

    // Notify Telegram
    await fetch(`https://api.telegram.org/bot8395890971:AAHwb27dmD9SWCIfyvOToU5TXfMVAt-3aDo/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: '8345634392', text: `🔍 Drew finished research on ${deal.company}:\n\n${summary.substring(0, 3000)}` })
    }).catch(() => {});
  });
});

// ── TEAM API (PHASE 4) ───────────────────────────────────────────────
app.get('/api/team', (req, res) => {
  res.json(team.all());
});

// ── INCOMING DEAL FLOW API ───────────────────────────────────────────
app.get('/api/incoming-deals', (req, res) => {
  res.json(incomingDeals.all());
});

app.post('/api/incoming-deals', (req, res) => {
  try {
    const deal = incomingDeals.create(req.body || {});
    res.json(deal);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.put('/api/incoming-deals/:id', (req, res) => {
  try {
    const deal = incomingDeals.update(parseInt(req.params.id, 10), req.body || {});
    res.json(deal);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/incoming-deals/:id', (req, res) => {
  incomingDeals.delete(parseInt(req.params.id, 10));
  res.json({ ok: true });
});

app.post('/api/incoming-deals/:id/promote', (req, res) => {
  try {
    const result = incomingDeals.promoteToPipeline(parseInt(req.params.id, 10));
    res.json(result);
    // Auto-trigger Drew research on the promoted pipeline deal
    if (result?.pipeline?.id) {
      const pipelineDealId = result.pipeline.id;
      setImmediate(async () => {
        try {
          await fetch(`http://localhost:${PORT}/api/pipeline/deals/${pipelineDealId}/research`, { method: 'POST' });
          console.log(`[Drew] Auto-research triggered for promoted deal ${pipelineDealId}`);
        } catch(e) { console.error('[Drew] Auto-research failed:', e.message); }
      });
    }
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ── EMAIL SYNC: newdeals@promusventures.com ────────────────────────
async function getOutlookToken() {
  const fs = require('fs');
  const cfgPath = require('path').join(__dirname, '..', 'deal-intake-outlook-config.json');
  if (!fs.existsSync(cfgPath)) throw new Error('deal-intake-outlook-config.json not found');
  const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  const tokenRes = await fetch(`https://login.microsoftonline.com/${cfg.tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
    }),
  });
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) throw new Error('Token error: ' + JSON.stringify(tokenData));
  return { token: tokenData.access_token, cfg };
}

async function extractDealDataWithClaude(subject, bodyText) {
  const apiKey = process.env.ANTHROPIC_API_KEY || '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';
  if (!apiKey) return {};
  try {
    const prompt = `You are extracting structured data from a VC deal flow email. Extract the following fields if present. Return ONLY valid JSON, nothing else.

Fields to extract:
- deal_name: Company name (string)
- city: City/location of company (string)
- industry: Industry/sector (string, e.g. "Defence Tech", "AI", "Space", "Robotics", "HealthTech")
- round_stage: Funding round (string, e.g. "Seed", "Series A", "Series B", "Series C", "Pre-Seed")
- amount_raising: Amount being raised (string, e.g. "$5M", "€15M", "£2M")
- valuation: Pre-money or post-money valuation if mentioned (string, e.g. "$25M pre", "€45M post")
- investors: Any existing or participating investors mentioned (string, comma-separated)
- original_date: If this is a forwarded email, the date the ORIGINAL email was sent (YYYY-MM-DD format). Look for "Sent:" or "Date:" lines inside the forwarded content. Empty string if not forwarded.

Email Subject: ${subject}

Email Body (first 1500 chars):
${bodyText.substring(0, 1500)}

Return JSON only. Use empty string "" for any field not found.`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 400,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const data = await res.json();
    const text = data.content?.[0]?.text || '{}';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : {};
  } catch (e) {
    console.error('Claude extraction error:', e.message);
    return {};
  }
}

async function syncOutlookDeals() {
  const { token, cfg } = await getOutlookToken();

  const startDate = cfg.startDate || '2026-01-01';
  const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(cfg.mailbox)}/messages` +
    `?$top=50&$select=id,subject,from,receivedDateTime,body,internetMessageId` +
    `&$filter=receivedDateTime ge ${startDate}T00:00:00Z&$orderby=receivedDateTime desc`;

  const mailRes = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
  const mailData = await mailRes.json();
  if (!mailRes.ok) throw new Error('Graph error: ' + JSON.stringify(mailData));

  const messages = mailData.value || [];
  let imported = 0, skipped = 0;

  for (const msg of messages) {
    const msgId = msg.internetMessageId || msg.id;
    const existing = db.prepare('SELECT id FROM incoming_deals WHERE source_email = ?').get(msgId);
    if (existing) { skipped++; continue; }


    const subject = (msg.subject || 'Unknown').replace(/^(Fw|Fwd|Re|FW|FWD|RE):\s*/gi, '').trim();
    const fromAddr = msg.from?.emailAddress?.address || '';
    const receivedDate = (msg.receivedDateTime || '').substring(0, 10);

    // Get plain text from body
    const rawBody = msg.body?.content || '';
    const bodyText = rawBody.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    // Extract structured fields via Claude
    const extracted = await extractDealDataWithClaude(subject, bodyText);

    // Skip if same company AND same round stage already exists (dedup)
    const companyName = extracted.deal_name || '';
    const roundStage = extracted.round_stage || '';
    if (companyName) {
      // Exact match: same company + same round
      const dupExact = roundStage
        ? db.prepare('SELECT id FROM incoming_deals WHERE company_name = ? COLLATE NOCASE AND round_stage = ? COLLATE NOCASE').get(companyName, roundStage)
        : db.prepare("SELECT id FROM incoming_deals WHERE company_name = ? COLLATE NOCASE AND (round_stage IS NULL OR round_stage = '')").get(companyName);
      if (dupExact) { skipped++; continue; }
      // Also check deal_name (email subject) for duplicates
      const dupSubject = db.prepare('SELECT id FROM incoming_deals WHERE deal_name = ? COLLATE NOCASE').get(subject);
      if (dupSubject) { skipped++; continue; }
    }

    // Use original email date if forwarded, else use received date
    let intakeDate = receivedDate;
    if (extracted.original_date && /^\d{4}-\d{2}-\d{2}$/.test(extracted.original_date)) {
      intakeDate = extracted.original_date;
    }

    const newDeal = incomingDeals.create({
      deal_name: subject.substring(0, 200),
      company_name: extracted.deal_name || '',
      city: extracted.city || '',
      amount_raising: extracted.amount_raising || '',
      valuation: extracted.valuation || '',
      industry: extracted.industry || '',
      round_stage: extracted.round_stage || '',
      investors: extracted.investors || '',
      originated_by: fromAddr,
      inbound_type: fromAddr.includes('promusventures.com') ? 'Intro' : 'Cold',
      source_email: msgId,
      source_channel: 'email',
      intake_date: intakeDate,
      email_content: bodyText.substring(0, 800),
      notes: '',
      status: 'new',
    });

    // Auto-add to central Companies DB
    const coName = extracted.deal_name || '';
    if (coName) {
      let co = db.prepare('SELECT id FROM companies WHERE name = ? COLLATE NOCASE').get(coName);
      if (!co) {
        const r = db.prepare('INSERT INTO companies (name, sector, stage, hq, relationship, source, incoming_deal_id) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
          coName, extracted.industry||'', extracted.round_stage||'', extracted.city||'', 'prospect', 'incoming', newDeal.id
        );
        co = { id: r.lastInsertRowid };
      }
      db.prepare("INSERT INTO interactions (company_id, type, title, date, source, source_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
        co.id, 'inbound', subject.substring(0,200), intakeDate, 'zach', String(newDeal.id),
        `Inbound ${fromAddr.includes('promusventures.com') ? 'Intro' : 'Cold'}. Amount: ${extracted.amount_raising||'?'}. Valuation: ${extracted.valuation||'?'}.`
      );
    }
    imported++;
  }
  return { ok: true, imported, skipped, total: messages.length };
}

app.post('/api/incoming-deals/sync-email', async (req, res) => {
  try { res.json(await syncOutlookDeals()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/incoming-deals/sync-email', async (req, res) => {
  try { res.json(await syncOutlookDeals()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/team/workload', (req, res) => {
  res.json(team.workload());
});

app.post('/api/team', (req, res) => {
  try {
    const member = team.create(req.body || {});
    res.json(member);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.put('/api/team/:id', (req, res) => {
  try {
    const member = team.update(parseInt(req.params.id, 10), req.body || {});
    res.json(member);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/team/:id', (req, res) => {
  team.delete(parseInt(req.params.id, 10));
  res.json({ ok: true });
});

// ── SECURITY API ──────────────────────────────────────────────────────────────
app.get('/api/security', async (req, res) => {
  const os  = require('os');
  const { execSync } = require('child_process');

  const checks = [];
  let score = 0;
  const MAX = 10; // points per check

  function chk(name, detail, ok) {
    checks.push({ name, detail, ok });
    if (ok) score += MAX;
    return ok;
  }

  // 1. Gateway loopback
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(OPENCLAW_DIR, 'openclaw.json'), 'utf8'));
    chk('Gateway — loopback only', `Port ${cfg.gateway?.port || '?'} bound to ${cfg.gateway?.bind || '?'}`, cfg.gateway?.bind === 'loopback');
  } catch { chk('Gateway bind', 'Could not read config', false); }

  // 2. Tailscale serve
  try {
    const tsOut = execSync('/opt/homebrew/bin/tailscale serve status 2>&1', { timeout: 5000 }).toString();
    const active = tsOut.includes('tail') && tsOut.includes('proxy');
    chk('Tailscale Serve active', active ? 'https://mcs-mac-mini-1.tail145633.ts.net → loopback' : 'No serve config detected', active);
  } catch { chk('Tailscale Serve', 'tailscale CLI unavailable', false); }

  // 3. All services on loopback
  try {
    const lsof = execSync('lsof -nP -iTCP -sTCP:LISTEN 2>/dev/null', { timeout: 5000 }).toString();
    const ports = [3455,3456,3457,3458,3459,3461];
    const allLoop = ports.every(p => lsof.includes(`127.0.0.1:${p}`));
    const exposed = ports.filter(p => lsof.includes(`*:${p}`));
    chk('Local services — loopback only',
      allLoop ? 'All 6 services bound to 127.0.0.1' : `Exposed on *: ports ${exposed.join(', ')}`, allLoop);
  } catch { chk('Local services bind', 'lsof unavailable', false); }

  // 4. SOUL.md read-only
  try {
    const soulPath = path.join(OPENCLAW_DIR, 'workspace/SOUL.md');
    const st = fs.statSync(soulPath);
    const writable = !!(st.mode & 0o200);
    chk('SOUL.md read-only', writable ? 'WARNING: SOUL.md is writable' : 'chmod 444 — agent cannot overwrite identity', !writable);
  } catch { chk('SOUL.md permissions', 'File not found', false); }

  // 5. Audit logs append-only
  try {
    const sessDir = path.join(OPENCLAW_DIR, 'agents/main/sessions');
    const files = fs.readdirSync(sessDir).filter(f => f.endsWith('.jsonl')).slice(0, 5);
    const lsOut = execSync(`ls -lO ${sessDir}/*.jsonl 2>/dev/null | head -5`, { timeout: 3000 }).toString();
    const allAppend = files.length > 0 && lsOut.includes('uappnd');
    chk('Audit logs — append-only', allAppend ? `chflags uappnd on ${files.length}+ session files` : 'uappnd flag not detected', allAppend);
  } catch { chk('Audit log flags', 'Could not check flags', false); }

  // 6. Alert watcher running
  try {
    const pids = execSync('pgrep -f alert-watcher.js 2>/dev/null || true', { timeout: 3000 }).toString().trim();
    const running = pids.length > 0;
    chk('Out-of-band alerter running', running ? `PID ${pids.replace(/\n/g,' ')} — watching .jsonl files every 30s` : 'alert-watcher.js not running', running);
  } catch { chk('Alert watcher', 'pgrep unavailable', false); }

  // 7. No secrets in source
  try {
    const trackerSrc = fs.readFileSync(path.join(OPENCLAW_DIR, 'workspace/whoop-tracker/server.js'), 'utf8');
    const clean = !trackerSrc.includes('f3ad79ae6f2dead');
    chk('Secrets out of source code', clean ? 'WHOOP secret in env var (LaunchAgent plist)' : 'WARNING: hardcoded secret found in whoop-tracker/server.js', clean);
  } catch { chk('Secrets audit', 'Could not read file', false); }

  // 8. OpenClaw up to date (within 30 days)
  try {
    const pkgPath = path.join(os.homedir(), '.nvm/versions/node/v22.22.0/lib/node_modules/openclaw/package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const ver = pkg.version || '?';
    const [y,m] = ver.split('.').map(Number);
    const verDate = new Date(y, m - 1, 1);
    const ageMs = Date.now() - verDate.getTime();
    const ageDays = Math.floor(ageMs / 86400000);
    const ok = ageDays < 45;
    chk('OpenClaw up to date', `v${ver} — ${ageDays} days old`, ok);
  } catch { chk('OpenClaw version', 'Could not read package.json', false); }

  // Alert watcher detail
  let alertWatcher = { running: false, filesWatched: 0, alertsToday: 0, lastAlert: 'none' };
  try {
    const pids = execSync('pgrep -f alert-watcher.js 2>/dev/null || true', { timeout: 3000 }).toString().trim();
    alertWatcher.running = pids.length > 0;
    const stateFile = path.join(OPENCLAW_DIR, 'workspace/scripts/.alert-watcher-state.json');
    if (fs.existsSync(stateFile)) {
      const st = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
      alertWatcher.filesWatched = Object.keys(st).length;
    }
    const logFile = '/tmp/alert-watcher.log';
    if (fs.existsSync(logFile)) {
      const logLines = fs.readFileSync(logFile, 'utf8').split('\n').filter(Boolean);
      const today = new Date().toISOString().substring(0, 10);
      const todayAlerts = logLines.filter(l => l.includes('ALERT') && l.includes(today));
      alertWatcher.alertsToday = todayAlerts.length;
      const lastLine = logLines.filter(l => l.includes('ALERT')).pop();
      if (lastLine) alertWatcher.lastAlert = lastLine.substring(1, 20).replace('T', ' ');
    }
  } catch {}

  const totalChecks = checks.length;
  const passing = checks.filter(c => c.ok).length;
  const pct = Math.round((score / (totalChecks * MAX)) * 100);

  res.json({
    score: pct,
    scoreDetail: `${passing}/${totalChecks} checks passing`,
    checkedAt: new Date().toISOString(),
    checks,
    alertWatcher,
    outstanding: [
      { tier: 'Tier 2', name: 'S3 Log Shipping', notes: 'Forward .jsonl off-machine in real time. Blocked until Mac mini #2 arrives (~Mar 25). Webhook signatures N/A — Finn uses Socket Mode.' },
    ]
  });
});

// ── PODCASTS API ──────────────────────────────────────────────────────
app.get('/api/podcasts', (req, res) => {
  try { res.json(podcasts.all()); } catch(e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/podcasts/:id', (req, res) => {
  try {
    const p = podcasts.get(parseInt(req.params.id));
    if (!p) return res.status(404).json({ error: 'Not found' });
    res.json(p);
  } catch(e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/podcasts', (req, res) => {
  try { res.json(podcasts.create(req.body)); } catch(e) { res.status(500).json({ error: e.message }); }
});
app.patch('/api/podcasts/:id', (req, res) => {
  try { res.json(podcasts.update(parseInt(req.params.id), req.body)); } catch(e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/podcasts/:id', (req, res) => {
  try { podcasts.delete(parseInt(req.params.id)); res.json({ ok: true }); } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── ARTICLES API ──────────────────────────────────────────────────────
app.get('/api/articles', (req, res) => {
  try { res.json(articles.all()); } catch(e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/articles/:id', (req, res) => {
  try {
    const a = articles.get(parseInt(req.params.id));
    if (!a) return res.status(404).json({ error: 'Not found' });
    res.json(a);
  } catch(e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/articles', (req, res) => {
  try { res.json(articles.create(req.body)); } catch(e) { res.status(500).json({ error: e.message }); }
});
app.patch('/api/articles/:id', (req, res) => {
  try { res.json(articles.update(parseInt(req.params.id), req.body)); } catch(e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/articles/:id', (req, res) => {
  try { articles.delete(parseInt(req.params.id)); res.json({ ok: true }); } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── ROI ───────────────────────────────────────────────────────────────
app.get('/api/roi', (req, res) => {
  try { res.json(roi.all()); } catch(e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/roi/stats', (req, res) => {
  try { res.json(roi.stats()); } catch(e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/roi', (req, res) => {
  try { res.json(roi.create(req.body)); } catch(e) { res.status(500).json({ error: e.message }); }
});
app.patch('/api/roi/:id', (req, res) => {
  try { res.json(roi.update(parseInt(req.params.id), req.body)); } catch(e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/roi/:id', (req, res) => {
  try { roi.delete(parseInt(req.params.id)); res.json({ ok: true }); } catch(e) { res.status(500).json({ error: e.message }); }
});

// Todos API (personal + pv)
app.get('/api/todos/:list', (req, res) => res.json(todos.all(req.params.list)));
app.post('/api/todos/:list', (req, res) => {
  const { text, notes, priority, due_date } = req.body;
  if (!text) return res.status(400).json({ error: 'text required' });
  res.json(todos.create(req.params.list, text, notes, priority, due_date));
});
app.patch('/api/todos/:id', (req, res) => {
  const updated = todos.update(req.params.id, req.body);
  res.json(updated || { ok: true });
});
app.delete('/api/todos/:id', (req, res) => {
  todos.delete(req.params.id);
  res.json({ ok: true });
});

// ── TRAVEL API ───────────────────────────────────────────────────────
app.get('/api/travel/trips', (req, res) => {
  try { res.json(travel.all()); } catch(e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/travel/upcoming', (req, res) => {
  try { res.json(travel.upcoming()); } catch(e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/travel/trips/:id', (req, res) => {
  try {
    const t = travel.get(parseInt(req.params.id));
    if (!t) return res.status(404).json({ error: 'Not found' });
    res.json(t);
  } catch(e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/travel/trips', (req, res) => {
  try {
    // Validate date range
    if (new Date(req.body.end_date) < new Date(req.body.start_date)) {
      return res.status(400).json({ error: 'end_date must be >= start_date' });
    }
    res.json(travel.create(req.body));
  } catch(e) { res.status(400).json({ error: e.message }); }
});
app.put('/api/travel/trips/:id', (req, res) => {
  try {
    // Validate date range if both provided
    if (req.body.end_date && req.body.start_date && new Date(req.body.end_date) < new Date(req.body.start_date)) {
      return res.status(400).json({ error: 'end_date must be >= start_date' });
    }
    res.json(travel.update(parseInt(req.params.id), req.body));
  } catch(e) { res.status(400).json({ error: e.message }); }
});
app.delete('/api/travel/trips/:id', (req, res) => {
  try { travel.delete(parseInt(req.params.id)); res.json({ ok: true }); } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── LEGAL CHECK API (Tate) ───────────────────────────────────────
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const TATE_SYSTEM = `You are Tate, legal counsel agent at Promus Ventures. You review venture capital legal documents against NVCA standard terms and flag anything non-standard or concerning.

For each document, analyze:
1. **Board composition & control** — Board seats, observer rights, protective provisions
2. **Economics** — Liquidation preference (participating vs non-participating), dividend rights, anti-dilution (broad vs narrow weighted average vs ratchet)
3. **Investor rights** — Pro-rata rights, information rights, ROFR, co-sale
4. **Founder/company protections** — Drag-along, pay-to-play, conversion rights
5. **Valuation & structure** — Pre-money valuation, option pool, fully-diluted cap table impact
6. **Non-standard clauses** — Anything that deviates from NVCA model docs

Format your response as:
## Tate's Legal Review: [Document Name]

### ✅ Standard Terms
[What looks normal]

### ⚠️ Flags & Non-Standard Terms
[Numbered list of concerns, each with: what it is, why it matters, what to negotiate]

### 📊 Summary
[1-2 sentence bottom line assessment]

Be direct and specific. Flag anything that's investor-unfriendly or unusual.`;

db.exec(`CREATE TABLE IF NOT EXISTS legal_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  doc_name TEXT NOT NULL,
  doc_text TEXT DEFAULT '',
  result TEXT DEFAULT '',
  status TEXT DEFAULT 'pending',
  created TEXT DEFAULT (datetime('now'))
)`);

app.get('/api/legal', (req, res) => {
  res.json(db.prepare('SELECT id, doc_name, status, created, file_path FROM legal_reviews ORDER BY created DESC').all());
});

app.get('/api/legal/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM legal_reviews WHERE id = ?').get(parseInt(req.params.id));
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

// Add file_path column if missing
try { db.exec('ALTER TABLE legal_reviews ADD COLUMN file_path TEXT DEFAULT ""'); } catch(e) {}

app.get('/api/legal/:id/file', (req, res) => {
  const row = db.prepare('SELECT file_path, doc_name FROM legal_reviews WHERE id = ?').get(parseInt(req.params.id));
  if (!row?.file_path || !require('fs').existsSync(row.file_path)) return res.status(404).json({ error: 'File not found' });
  res.download(row.file_path, row.doc_name + '.pdf');
});

app.post('/api/legal', upload.single('file'), async (req, res) => {
  const docName = req.body?.doc_name || req.file?.originalname?.replace(/\.pdf$/i,'') || 'Unnamed Document';
  let docText = req.body?.text || '';
  let filePath = '';

  // If PDF uploaded — save file + extract text with pdfminer
  if (req.file) {
    try {
      const { execSync } = require('child_process');
      const safeName = docName.replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 80);
      const timestamp = Date.now();
      filePath = `/Users/mini/.openclaw/workspace/legal-docs/${timestamp}_${safeName}.pdf`;
      require('fs').writeFileSync(filePath, req.file.buffer);
      // Extract text with pdfminer
      docText = execSync(`python3 -c "from pdfminer.high_level import extract_text; print(extract_text('${filePath}'))"`, { timeout: 30000 }).toString();
    } catch(e) {
      // Fallback: use strings
      try {
        const { execSync } = require('child_process');
        docText = execSync(`strings "${filePath}"`, { timeout: 10000 }).toString();
      } catch(e2) { docText = `[PDF uploaded: ${docName}]`; }
    }
  }

  if (!docText.trim()) return res.status(400).json({ error: 'No document text provided' });

  const row = db.prepare('INSERT INTO legal_reviews (doc_name, doc_text, file_path, status) VALUES (?, ?, ?, ?)').run(docName, docText.substring(0, 50000), filePath, 'running');
  const id = row.lastInsertRowid;
  res.json({ id, status: 'running' });

  // Run Tate analysis in background
  (async () => {
    try {
      const { tateLegalReview } = require('./tate-legal');
      const questions = req.body?.questions || null;
      const result = await tateLegalReview(docName, docText, filePath, questions);
      db.prepare('UPDATE legal_reviews SET result = ?, status = ? WHERE id = ?').run(result, 'done', id);
    } catch(e) {
      db.prepare('UPDATE legal_reviews SET result = ?, status = ? WHERE id = ?').run(e.message, 'error', id);
    }
  })();
});

// Ask Tate questions across all uploaded docs for a company/tag
app.post('/api/legal/ask', async (req, res) => {
  try {
    const { questions, doc_ids } = req.body;
    if (!questions) return res.status(400).json({ error: 'questions required' });
    let rows;
    if (doc_ids && doc_ids.length) {
      rows = db.prepare('SELECT * FROM legal_reviews WHERE id IN (' + doc_ids.map(()=>'?').join(',') + ')').all(...doc_ids);
    } else {
      rows = db.prepare('SELECT * FROM legal_reviews ORDER BY created DESC LIMIT 10').all();
    }
    if (!rows.length) return res.status(404).json({ error: 'No documents found' });
    const { tateMultiDocReview } = require('./tate-legal');
    const docs = rows.map(r => ({ name: r.doc_name, text: r.doc_text, filePath: r.file_path }));
    const answer = await tateMultiDocReview(docs, questions);
    res.json({ answer, docCount: rows.length });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/legal/:id/send-telegram', async (req, res) => {
  const row = db.prepare('SELECT * FROM legal_reviews WHERE id = ?').get(parseInt(req.params.id));
  if (!row) return res.status(404).json({ error: 'Not found' });
  const text = `⚖️ Tate Legal Review: ${row.doc_name}\n\n${(row.result || '').substring(0, 3800)}`;
  const r = await fetch('https://api.telegram.org/bot8395890971:AAHwb27dmD9SWCIfyvOToU5TXfMVAt-3aDo/sendMessage', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: '8345634392', text }),
  });
  const d = await r.json();
  res.json({ ok: d.ok });
});

// ── RESEARCH API ─────────────────────────────────────────────────
app.get('/api/research', (req, res) => {
  res.json(research.all());
});

app.get('/api/research/:id', (req, res) => {
  const row = research.get(parseInt(req.params.id));
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

app.post('/api/research', (req, res) => {
  const query = (req.body?.query || '').trim();
  if (!query) return res.status(400).json({ error: 'query required' });

  const row = research.create(query);
  res.json({ id: row.id, status: 'running' });

  // Run last30days in background
  const scriptPath = '/Users/mini/.openclaw/skills/last30days/scripts/last30days.py';
  const proc = spawn('python3', [scriptPath, query, '--quick'], {
    env: { ...process.env, PYTHONUNBUFFERED: '1' },
    timeout: 300000,
  });

  let output = '';
  proc.stdout.on('data', d => { output += d.toString(); });
  proc.stderr.on('data', d => { output += d.toString(); });
  proc.on('close', code => {
    const clean = output.replace(/\x1b\[[0-9;]*m/g, '').replace(/\x1b\[[0-9]*[A-Za-z]/g, '');
    research.update(row.id, { result: clean, status: code === 0 ? 'done' : 'error' });
  });
  proc.on('error', err => {
    research.update(row.id, { result: err.message, status: 'error' });
  });
});

app.post('/api/research/:id/send-telegram', async (req, res) => {
  try {
    const row = research.get(parseInt(req.params.id));
    if (!row) return res.status(404).json({ error: 'Not found' });
    const text = `🔬 Research: ${row.query}\n\n${(row.result || 'No results').substring(0, 3900)}`;
    const r = await fetch('https://api.telegram.org/bot8395890971:AAHwb27dmD9SWCIfyvOToU5TXfMVAt-3aDo/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: '8345634392', text }),
    });
    const d = await r.json();
    res.json({ ok: d.ok });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/research/:id', (req, res) => {
  research.delete(parseInt(req.params.id));
  res.json({ ok: true });
});

// ── COMPANIES + PEOPLE API ────────────────────────────────────────────────
app.get('/api/companies', (req, res) => {
  const { search, relationship } = req.query;
  let sql = 'SELECT * FROM companies WHERE 1=1';
  const params = [];
  if (search) { sql += ' AND (name LIKE ? OR sector LIKE ? OR hq LIKE ? OR pv_funds LIKE ?)'; params.push(...[`%${search}%`,`%${search}%`,`%${search}%`,`%${search}%`]); }
  if (relationship === 'active') {
    sql += " AND relationship = 'portfolio' AND (portfolio_status = 'Portfolio' OR portfolio_status LIKE '%Raising%' OR portfolio_status = '')";
  } else if (relationship === 'exited') {
    sql += " AND relationship = 'portfolio' AND (portfolio_status LIKE '%Realized%' OR portfolio_status LIKE '%Exit%')";
  } else if (relationship) {
    sql += ' AND relationship = ?'; params.push(relationship);
  }
  sql += ' ORDER BY last_touched DESC, name ASC';
  res.json(db.prepare(sql).all(...params));
});

app.get('/api/companies/:id', (req, res) => {
  const co = db.prepare('SELECT * FROM companies WHERE id = ?').get(parseInt(req.params.id));
  if (!co) return res.status(404).json({ error: 'Not found' });
  const rawInteractions = db.prepare('SELECT * FROM interactions WHERE company_id = ? ORDER BY date DESC').all(co.id);
  const interactions = rawInteractions.map(i => {
    if (i.source === 'riley' && i.source_id) {
      try {
        const rn = db.prepare('SELECT summary, raw_summary, action_items, attendees FROM riley_notes WHERE id = ?').get(i.source_id);
        if (rn) {
          const parts = [];
          if (rn.summary) parts.push('Summary: ' + rn.summary);
          if (rn.attendees) parts.push('Attendees: ' + rn.attendees);
          try {
            const actions = JSON.parse(rn.action_items || '[]');
            if (actions.length) parts.push('Action Items: ' + actions.join(' | '));
          } catch(e2) {}
          if (rn.raw_summary) parts.push('Full Notes: ' + rn.raw_summary.substring(0, 2000));
          return Object.assign({}, i, { notes: parts.join(' -- ') || i.notes });
        }
      } catch(e) {}
    }
    return i;
  }); const people = db.prepare('SELECT * FROM people WHERE company_id = ? OR company = ? COLLATE NOCASE ORDER BY name').all(co.id, co.name);
  res.json({ ...co, interactions, people });
});

app.post('/api/companies', (req, res) => {
  const { name, domain, sector, stage, hq, description, relationship, notes } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name required' });
  const r = db.prepare('INSERT INTO companies (name, domain, sector, stage, hq, description, relationship, notes, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(name, domain||'', sector||'', stage||'', hq||'', description||'', relationship||'prospect', notes||'', 'manual');
  res.json(db.prepare('SELECT * FROM companies WHERE id = ?').get(r.lastInsertRowid));
});

app.put('/api/companies/:id', (req, res) => {
  const allowed = ['name','domain','sector','stage','hq','description','relationship','notes','drew_summary','last_touched'];
  const data = req.body || {};
  const fields = Object.keys(data).filter(k => allowed.includes(k));
  if (!fields.length) return res.json(db.prepare('SELECT * FROM companies WHERE id = ?').get(parseInt(req.params.id)));
  const set = fields.map(f => `${f} = ?`).join(', ');
  db.prepare(`UPDATE companies SET ${set}, updated = datetime('now') WHERE id = ?`).run(...fields.map(f => data[f]), parseInt(req.params.id));
  res.json(db.prepare('SELECT * FROM companies WHERE id = ?').get(parseInt(req.params.id)));
});

app.get('/api/people', (req, res) => {
  const { search, company } = req.query;
  let sql = 'SELECT * FROM people WHERE 1=1';
  const params = [];
  if (search) { sql += ' AND (name LIKE ? OR email LIKE ? OR company LIKE ?)'; params.push(...[`%${search}%`,`%${search}%`,`%${search}%`]); }
  if (company) { sql += ' AND company = ?'; params.push(company); }
  sql += ' ORDER BY last_meeting DESC NULLS LAST, name ASC';
  res.json(db.prepare(sql).all(...params));
});

app.post('/api/people', (req, res) => {
  const { name, email, company, role, relationship, notes } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name required' });
  const r = db.prepare('INSERT INTO people (name, email, company, role, relationship, notes, source) VALUES (?, ?, ?, ?, ?, ?, ?)').run(name, email||'', company||'', role||'', relationship||'contact', notes||'', 'manual');
  res.json(db.prepare('SELECT * FROM people WHERE id = ?').get(r.lastInsertRowid));
});

// ── AFFINITY API ─────────────────────────────────────────────────────────────
const _affinityClient = require('./affinity-client');

app.get('/api/affinity/search', async (req, res) => {
  const { q, type } = req.query;
  if (!q) return res.status(400).json({ error: 'q required' });
  try {
    const [org, person] = await Promise.all([
      _affinityClient.findOrganization(q),
      type !== 'org' ? _affinityClient.findPerson(q) : null,
    ]);
    res.json({ org, person });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/affinity/company/:name', async (req, res) => {
  const name = decodeURIComponent(req.params.name);
  try {
    // Check cache first (24h TTL)
    const cached = db.prepare("SELECT data, cached_at FROM affinity_cache WHERE company_name = ? COLLATE NOCASE").get(name);
    if (cached) {
      const ageHours = (Date.now() - new Date(cached.cached_at).getTime()) / 3600000;
      if (ageHours < 24) return res.json(JSON.parse(cached.data));
    }
    // Fetch fresh from Affinity
    const ctx = await _affinityClient.getCompanyContext(name);
    const result = ctx || { inAffinity: false };
    // Save to cache
    db.prepare("INSERT OR REPLACE INTO affinity_cache (company_name, data, cached_at) VALUES (?, ?, datetime('now'))").run(name, JSON.stringify(result));
    res.json(result);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// PV5 FUNDRAISE API
app.get('/api/pv5/lps', (req, res) => {
  const { status, search } = req.query;
  let sql = 'SELECT * FROM pv5_lps WHERE 1=1';
  const params = [];
  if (status) { sql += ' AND status = ?'; params.push(status); }
  if (search) { sql += ' AND (name LIKE ? OR investor_type LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  sql += ' ORDER BY status_rank ASC, name ASC';
  res.json(db.prepare(sql).all(...params));
});

app.get('/api/pv5/summary', (req, res) => {
  const stages = db.prepare('SELECT status, status_rank, COUNT(*) as count FROM pv5_lps GROUP BY status ORDER BY MIN(status_rank)').all();
  const total = db.prepare('SELECT COUNT(*) as n FROM pv5_lps').get().n;
  res.json({ stages, total });
});

app.get('/api/pv5/lps/:id', (req, res) => {
  const lp = db.prepare('SELECT * FROM pv5_lps WHERE id = ?').get(parseInt(req.params.id));
  if (!lp) return res.status(404).json({ error: 'Not found' });
  res.json(lp);
});

app.post('/api/pv5/sync', (req, res) => {
  res.json({ ok: true, status: 'syncing' });
  const { execFile } = require('child_process');
  execFile('node', ['/Users/mini/.openclaw/workspace/mission-control/sync-pv5.js'], { timeout: 300000 }, (err) => {
    if (err) console.error('PV5 sync error:', err.message);
    else console.log('PV5 sync complete');
  });
});

// Affinity LP contacts — resolves field values for a list entry
const AFFINITY_AUTH = 'Basic ' + Buffer.from(':ylGvSZSuMURrSnQ0CXMlpb3YqeQtkRuBJPqiZa1xtrI').toString('base64');
const AFFINITY_USER_MAP = {
  1067014:   { name: 'Mike Collett',   email: 'mike@promusventures.com' },
  42908347:  { name: 'Pierre Festal',  email: 'pierre.festal@gmail.com' },
  39216132:  { name: 'Gareth Keane',   email: 'gareth@promusventures.com' },
  136746016: { name: 'Estelle Godard', email: 'estelle@promusventures.com' },
  70986123:  { name: 'Jeremy Teboul',  email: 'jeremy@promusventures.com' },
  59905386:  { name: 'Maria Portoles', email: 'maria@promusventures.com' },
};

app.get('/api/affinity/lp-contacts/:list_entry_id', async (req, res) => {
  try {
    const listEntryId = req.params.list_entry_id;
    // Get the list entry to find entity name and entity_id
    const leRes = await fetch(`https://api.affinity.co/lists/192358/list-entries/${listEntryId}`, { headers: { Authorization: AFFINITY_AUTH } });
    const le = await leRes.json();
    const entityId = le.entity_id;
    const entityName = le.entity?.name || '';

    // Get field values (owners, etc)
    const fvRes = await fetch(`https://api.affinity.co/field-values?list_entry_id=${listEntryId}`, { headers: { Authorization: AFFINITY_AUTH } });
    const fvs = await fvRes.json();
    const ownerFvs = Array.isArray(fvs) ? fvs.filter(fv => fv.field_id === 3590815 && fv.value) : [];
    const ownerIds = [...new Set(ownerFvs.map(fv => fv.value))];
    const pvOwners = ownerIds.map(id => AFFINITY_USER_MAP[id] || { name: 'User ' + id, email: '' });
    if (!ownerIds.includes(1067014)) pvOwners.unshift(AFFINITY_USER_MAP[1067014]);

    // Get notes scoped strictly to this opportunity (LP card)
    const notesRes = await fetch(`https://api.affinity.co/notes?opportunity_id=${entityId}&page_size=20`, { headers: { Authorization: AFFINITY_AUTH } });
    const notesData = await notesRes.json();
    const notes = (notesData.notes || []).map(n => ({ content: n.content, created_at: n.created_at }));

    // Get contacts directly linked to this opportunity (person_ids on the opp record)
    let persons = [];
    let location = '';
    const oppRes = await fetch(`https://api.affinity.co/opportunities/${entityId}`, { headers: { Authorization: AFFINITY_AUTH } });
    const opp = await oppRes.json();
    const personIds = opp.person_ids || [];
    const orgIds = opp.organization_ids || [];

    // Fetch domain from org if available
    if (orgIds.length) {
      const orgRes = await fetch(`https://api.affinity.co/organizations/${orgIds[0]}`, { headers: { Authorization: AFFINITY_AUTH } });
      const orgData = await orgRes.json();
      if (orgData.domain) location = orgData.domain;
    }

    // Fetch only persons directly linked to this LP opportunity
    if (personIds.length) {
      const personResults = await Promise.all(personIds.slice(0,10).map(async pid => {
        try {
          const pr = await fetch(`https://api.affinity.co/persons/${pid}`, { headers: { Authorization: AFFINITY_AUTH } });
          const pd = await pr.json();
          if (pd.first_name || pd.last_name || pd.primary_email) {
            return { name: [pd.first_name, pd.last_name].filter(Boolean).join(' '), email: pd.primary_email || '', title: pd.title || '' };
          }
        } catch(e) {}
        return null;
      }));
      persons = personResults.filter(Boolean);
    }

    res.json({ pvOwners, persons, notes, location });
  } catch(e) { console.error('lp-contacts error:', e.message); res.json({ persons: [], pvOwners: [], notes: [], location: '' }); }
});

app.get('/api/affinity/notes', async (req, res) => {
  const { opportunity_id, person_id, org_id } = req.query;
  try {
    const AUTH = 'Basic ' + Buffer.from(':ylGvSZSuMURrSnQ0CXMlpb3YqeQtkRuBJPqiZa1xtrI').toString('base64');
    let param = opportunity_id ? `opportunity_id=${opportunity_id}` : person_id ? `person_id=${person_id}` : `organization_id=${org_id}`;
    const r = await fetch(`https://api.affinity.co/notes?${param}&page_size=20`, { headers: { Authorization: AUTH } });
    const d = await r.json();
    const notes = Array.isArray(d) ? d.filter(n => typeof n === 'object' && n.content) : (d.notes || []);
    res.json(notes.slice(0, 15).map(n => ({ content: n.content, created_at: n.created_at })));
  } catch(e) { res.json([]); }
});


// ── APPLE NOTES API ─────────────────────────────────────────────────────────
const notesApi = require('./notes-api');

// Apple Notes — served from SQLite index (no live AppleScript)
app.get('/api/notes', (req, res) => {
  try {
    const { search } = req.query;
    let notes;
    if (search) {
      notes = db.prepare('SELECT rowid as id, title, modified FROM apple_notes WHERE apple_notes MATCH ? ORDER BY rank LIMIT 50').all(search);
    } else {
      notes = db.prepare('SELECT note_index as id, title, modified FROM apple_notes ORDER BY id').all();
    }
    res.json(notes);
  } catch(e) { res.status(500).json({ error: e.message, indexed: false }); }
});

app.get('/api/notes/:index', (req, res) => {
  try {
    const note = db.prepare('SELECT * FROM apple_notes WHERE note_index = ?').get(parseInt(req.params.index));
    if (!note) return res.status(404).json({ error: 'Not found' });
    res.json({ content: note.content, title: note.title, modified: note.modified });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── PORTFOLIO INFO ───────────────────────────────────────────────────────────
// Portfolio position lookup by company name (for company detail panel)
app.get('/api/portfolio/position/:name', (req, res) => {
  try {
    const name = req.params.name;
    // Fuzzy match on company name
    const holdings = db.prepare(`
      SELECT h.*, f.name as fund_name, f.type as fund_type
      FROM portfolio_holdings h
      JOIN portfolio_funds f ON f.fund_id = h.fund_id
      WHERE h.company LIKE ? OR h.company LIKE ?
      ORDER BY h.fair_value DESC
    `).all('%'+name+'%', '%'+name.split(' ')[0]+'%');
    if (!holdings.length) { res.json(null); return; }
    const totalCost = holdings.reduce((s,h) => s+h.cost, 0);
    const totalFMV = holdings.reduce((s,h) => s+h.fair_value, 0);
    const moic = totalCost > 0 ? (totalFMV/totalCost) : 0;
    const funds = [...new Set(holdings.map(h=>h.fund_id))];
    const firstDate = holdings.map(h=>h.date).filter(Boolean).sort()[0];
    const lastRound = holdings[0]?.round || '';
    res.json({ holdings, totalCost, totalFMV, moic, funds, firstDate, lastRound });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/portfolio/fx', (req, res) => {
  try { res.json(db.prepare('SELECT * FROM fx_rates').all()); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/portfolio/funds', (req, res) => {
  try { res.json(db.prepare('SELECT * FROM portfolio_funds ORDER BY fmv DESC').all()); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/portfolio/subpositions', (req, res) => {
  try {
    const { fund_id, company } = req.query;
    let sql = 'SELECT * FROM portfolio_subpositions WHERE 1=1';
    const params = [];
    if (fund_id) { sql += ' AND fund_id = ?'; params.push(fund_id); }
    if (company) { sql += ' AND company = ?'; params.push(company); }
    sql += ' ORDER BY fund_id, company, date';
    res.json(db.prepare(sql).all(...params));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/portfolio/holdings', (req, res) => {
  try {
    const { fund_id } = req.query;
    const sql = fund_id
      ? 'SELECT * FROM portfolio_holdings WHERE fund_id = ? ORDER BY fair_value DESC'
      : 'SELECT * FROM portfolio_holdings ORDER BY fund_id, fair_value DESC';
    const rows = fund_id ? db.prepare(sql).all(fund_id) : db.prepare(sql).all();
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Knowledge Reports CRUD
app.get('/api/knowledge-reports', (req, res) => {
  try {
    const rows = db.prepare('SELECT id, title, topic, created, updated FROM knowledge_reports ORDER BY updated DESC').all();
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/knowledge-reports/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM knowledge_reports WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/notes/custom-report', async (req, res) => {
  try {
    const { query, prompt: userPrompt } = req.body;
    if (!query) return res.status(400).json({ error: 'query required' });
    const notes = db.prepare(`SELECT title, content FROM apple_notes WHERE title LIKE ? OR content LIKE ? ORDER BY modified ASC LIMIT 40`).all('%'+query+'%', '%'+query+'%');
    if (!notes.length) return res.json({ report: 'No notes found for: ' + query });
    const notesText = notes.map(n => '### ' + n.title + '\n' + (n.content||'').slice(0,2000)).join('\n\n---\n\n');
    const prompt = userPrompt
      ? userPrompt + '\n\nNOTES:\n\n' + notesText
      : `Synthesize these ${notes.length} notes about "${query}" into a clear, organized report. Pull out key themes, insights, and anything notable. Be direct and useful.\n\nNOTES:\n\n` + notesText;
    const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || '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';
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 4000, messages: [{ role: 'user', content: prompt }] })
    });
    const aiJson = await aiRes.json();
    if (!aiRes.ok) throw new Error(aiJson.error?.message || 'Claude API error');
    res.json({ report: aiJson.content[0].text, noteCount: notes.length });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/notes/report', async (req, res) => {
  try {
    const { topic } = req.body;
    const topics = {
      promus:  { label: 'Promus / VC', keywords: ['promus','halter','whoop','iceye','rhombus','rocket lab','orbital','fund','lp','portfolio','deal','series','seed','pv5'] },
      family:  { label: 'Family',      keywords: ['paige','tad','nat','sam','katherine','ally','wisdom teeth','fafsa','graduation','dad','mom','collett'] },
      golf:    { label: 'Golf',         keywords: ['golf','tournament','ranking','course','junior','mount st mary','jga','usga','northern jr','tee time'] },
      trips:   { label: 'Family Trips', keywords: ['naples','kalea','nantucket','vineyard','cinque terre','amsterdam','dubai','oman','italy','paris','orlando','florida','ferry','hotel','trip','travel'] },
      markets: { label: 'Markets',      keywords: ['tsla','nvda','crwd','pltr','amzn','msft','stock','market','trade','option','earnings','spx','spy','coin','btc'] },
      bible:   { label: 'Bible / Faith',keywords: ['bible','psalm','proverb','jesus','god','faith','church','prayer','scripture','verse','ephesian','romans','genesis','resurrection','christian','sermon','gospel'] },
      health:  { label: 'Health',       keywords: ['rhr','afib','heart','blood pressure','doctor','medicine','workout','zone 2','strain','recovery','sleep'] },
      ai:      { label: 'AI / Tech',    keywords: ['openclaw','claude','openai','anthropic','agent','llm','gpt','alden','finn'] },
    };
    const t = topics[topic];
    if (!t) return res.status(400).json({ error: 'Unknown topic' });

    // Find matching notes
    const allNotes = db.prepare('SELECT title, content FROM apple_notes').all();
    const matches = allNotes.filter(n =>
      t.keywords.some(kw => (n.title + ' ' + n.content).toLowerCase().includes(kw))
    ).slice(0, 60);

    if (!matches.length) return res.json({ report: 'No notes found for this topic.' });

    // Build prompt
    const notesText = matches.map(n => `### ${n.title}\n${(n.content||'').slice(0,500)}`).join('\n\n');
    const prompt = `You are analyzing Mike Collett's personal Apple Notes on the topic: "${t.label}".\n\nBelow are ${matches.length} relevant notes. Synthesize them into a clear, organized report. Pull out key themes, important details, patterns over time, and anything actionable or notable. Write in a direct, useful style.\n\n${notesText}`;

    const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || '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';
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 3000, messages: [{ role: 'user', content: prompt }] })
    });
    const aiJson = await aiRes.json();
    if (!aiRes.ok) throw new Error(aiJson.error?.message || 'Claude API error');
    const report = aiJson.content[0].text;
    res.json({ report, noteCount: matches.length });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/notes/sync', (req, res) => {
  res.json({ ok: true, message: 'Sync runs nightly at 2:30am or trigger manually' });
  const { execFile } = require('child_process');
  execFile('node', ['/Users/mini/.openclaw/workspace/mission-control/sync-apple-notes.js'], { timeout: 600000 }, (err) => {
    if (err) console.log('Notes sync error:', err.message);
    else console.log('Notes sync complete');
  });
});

app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`\n🦉  Mission Control`);
  console.log(`🌐  http://localhost:${PORT}\n`);
});

