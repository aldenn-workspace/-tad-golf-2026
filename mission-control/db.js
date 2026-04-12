const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'data', 'mission.db'));

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// ── TASKS ─────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    title     TEXT NOT NULL,
    notes     TEXT DEFAULT '',
    status    TEXT DEFAULT 'todo',
    assignee  TEXT DEFAULT 'alden',
    priority  TEXT DEFAULT 'normal',
    created   TEXT DEFAULT (datetime('now')),
    updated   TEXT DEFAULT (datetime('now'))
  );
`);

// ── CALENDAR EVENTS ───────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS calendar_events (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT NOT NULL,
    description TEXT DEFAULT '',
    event_type  TEXT DEFAULT 'cron',
    scheduled   TEXT,
    recurrence  TEXT DEFAULT '',
    status      TEXT DEFAULT 'active',
    source      TEXT DEFAULT 'manual',
    created     TEXT DEFAULT (datetime('now'))
  );
`);

// ── VC COPILOT (LEVEL 2: STORAGE + KNOWLEDGE) ───────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS vc_knowledge (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT NOT NULL,
    content     TEXT NOT NULL,
    source      TEXT DEFAULT 'manual',
    tags        TEXT DEFAULT '',
    created     TEXT DEFAULT (datetime('now'))
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS vc_sessions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    company     TEXT NOT NULL,
    stage       TEXT DEFAULT '',
    status      TEXT DEFAULT 'active',
    created     TEXT DEFAULT (datetime('now')),
    updated     TEXT DEFAULT (datetime('now'))
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS vc_session_messages (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id  INTEGER NOT NULL,
    role        TEXT NOT NULL,
    content     TEXT NOT NULL,
    created     TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(session_id) REFERENCES vc_sessions(id)
  );
`);

// ── PROMUS PIPELINE (PHASE 4: DEAL PIPELINE + TEAM) ─────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS promus_deals (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    company             TEXT NOT NULL,
    stage               TEXT DEFAULT '',
    owner               TEXT DEFAULT 'mike',
    status              TEXT DEFAULT 'sourcing',
    probability         INTEGER DEFAULT 10,
    check_size_usd      INTEGER DEFAULT 0,
    target_close_date   TEXT DEFAULT '',
    next_step           TEXT DEFAULT '',
    memo_status         TEXT DEFAULT 'not-started',
    notes               TEXT DEFAULT '',
    source              TEXT DEFAULT 'manual',
    created             TEXT DEFAULT (datetime('now')),
    updated             TEXT DEFAULT (datetime('now'))
  );
`);

// Migration: add sector + lead columns if missing (idempotent)
try { db.exec(`ALTER TABLE promus_deals ADD COLUMN sector TEXT DEFAULT ''`); } catch(e) {}
try { db.exec(`ALTER TABLE promus_deals ADD COLUMN lead   TEXT DEFAULT ''`); } catch(e) {}

// Seed representative pipeline deals if table is empty
const _dealCount = db.prepare('SELECT COUNT(*) AS n FROM promus_deals').get().n;
if (_dealCount === 0) {
  const _dealSeeds = [
    { company: 'Orbital Dynamics',  status: 'first-look', sector: 'Space',              lead: 'mike',   owner: 'mike',   source: 'warm intro',   probability: 30, check_size_usd: 3000000, notes: 'SAR satellite constellation with proprietary signal processing. Compelling team ex-SpaceX + NRO. TAM: $8B. Need to validate customer pipeline before First Call memo.' },
    { company: 'MachineForge AI',   status: 'diligence',  sector: 'AI / Manufacturing', lead: 'john',   owner: 'john',   source: 'conference',   probability: 55, check_size_usd: 4000000, notes: 'AI-native CNC programming — reduces machinist setup time 70%. Two design partners at $40K ARR each. Strong technical moat via proprietary toolpath model. Full DD underway.' },
    { company: 'NeuralFab',         status: 'sourcing',   sector: 'Robotics',           lead: 'mike',   owner: 'mike',   source: 'inbound',      probability: 10, check_size_usd: 2500000, notes: 'Autonomous robotic assembly for electronics manufacturing. Pre-product. Founder ex-Foxconn engineering lead. Early but worth watching.' },
    { company: 'SkyVector Systems', status: 'ic',         sector: 'Space / Autonomy',   lead: 'pierre', owner: 'pierre', source: 'portfolio ref', probability: 70, check_size_usd: 4500000, notes: 'Autonomous navigation software for satellite constellations. $1.2M ARR, 3 government contracts. Competing with Slingshot Aerospace. Decision pending IC vote — recommend yes.' },
    { company: 'DepthSense',        status: 'passed',     sector: 'AI',                 lead: 'mike',   owner: 'mike',   source: 'warm intro',   probability:  0, check_size_usd: 3000000, notes: 'Passed at IC. Valuation expectation too high ($45M pre, pre-revenue). Revisit at Series A if traction materializes.' },
  ];
  const _insertDeal = db.prepare(`
    INSERT INTO promus_deals (company, stage, sector, lead, owner, status, probability, check_size_usd, notes, source)
    VALUES (@company, @stage, @sector, @lead, @owner, @status, @probability, @check_size_usd, @notes, @source)
  `);
  const _txDeals = db.transaction((rows) => rows.forEach((r) => _insertDeal.run(r)));
  _txDeals(_dealSeeds.map(d => ({ stage: '', ...d })));
}

db.exec(`
  CREATE TABLE IF NOT EXISTS promus_team (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    name                TEXT NOT NULL,
    handle              TEXT NOT NULL UNIQUE,
    role                TEXT DEFAULT '',
    focus               TEXT DEFAULT '',
    status              TEXT DEFAULT 'active',
    capacity_pct        INTEGER DEFAULT 100,
    created             TEXT DEFAULT (datetime('now')),
    updated             TEXT DEFAULT (datetime('now'))
  );
`);

// ── INCOMING DEAL FLOW ───────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS incoming_deals (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    deal_name           TEXT NOT NULL,
    city                TEXT DEFAULT '',
    amount_raising      TEXT DEFAULT '',
    valuation           TEXT DEFAULT '',
    industry            TEXT DEFAULT '',
    originated_by       TEXT DEFAULT '',
    inbound_type        TEXT DEFAULT 'Other',
    source_email        TEXT DEFAULT '',
    source_channel      TEXT DEFAULT 'manual',
    intake_date         TEXT DEFAULT (date('now')),
    notes               TEXT DEFAULT '',
    status              TEXT DEFAULT 'new',
    promoted_deal_id    INTEGER DEFAULT NULL,
    created             TEXT DEFAULT (datetime('now')),
    updated             TEXT DEFAULT (datetime('now'))
  );
`);

const teamSeeds = [
  { name: 'Mike', handle: 'mike', role: 'Managing Partner', focus: 'Investment decisions and founder relationships', status: 'active', capacity_pct: 100 },
  { name: 'Alden', handle: 'alden', role: 'Chief of Staff AI', focus: 'Ops automation and system reliability', status: 'active', capacity_pct: 100 },
  { name: 'Research Agent', handle: 'research', role: 'Market Intelligence Agent', focus: 'Diligence prep, portfolio signals, and briefings', status: 'active', capacity_pct: 80 },
];

const existingTeamCount = db.prepare('SELECT COUNT(*) AS n FROM promus_team').get().n;
if (existingTeamCount === 0) {
  const insertTeam = db.prepare(`
    INSERT INTO promus_team (name, handle, role, focus, status, capacity_pct)
    VALUES (@name, @handle, @role, @focus, @status, @capacity_pct)
  `);
  const tx = db.transaction((rows) => rows.forEach((r) => insertTeam.run(r)));
  tx(teamSeeds);
}

// ── PROJECT DECISIONS ─────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS project_decisions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    project     TEXT NOT NULL DEFAULT 'general',
    decision    TEXT NOT NULL,
    rationale   TEXT DEFAULT '',
    decided_by  TEXT DEFAULT 'mike',
    status      TEXT DEFAULT 'active',
    created     TEXT DEFAULT (datetime('now')),
    superseded  TEXT DEFAULT NULL
  );
`);

// ── PROJECT BLOCKERS ──────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS project_blockers (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    project      TEXT NOT NULL DEFAULT 'general',
    blocker      TEXT NOT NULL,
    severity     TEXT DEFAULT 'medium',
    status       TEXT DEFAULT 'open',
    owner        TEXT DEFAULT 'mike',
    notes        TEXT DEFAULT '',
    created      TEXT DEFAULT (datetime('now')),
    resolved_at  TEXT DEFAULT NULL
  );
`);

// ── TRAVEL TRIPS ──────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS travel_trips (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    name             TEXT NOT NULL,
    start_date       TEXT NOT NULL,
    end_date         TEXT NOT NULL,
    primary_location TEXT NOT NULL,
    purpose          TEXT DEFAULT 'business',
    status           TEXT DEFAULT 'planned',
    attendees        TEXT DEFAULT '',
    notes            TEXT DEFAULT '',
    budget_usd       REAL DEFAULT 0,
    created          TEXT DEFAULT (datetime('now')),
    updated          TEXT DEFAULT (datetime('now'))
  );
`);

// Seed with demo trips if table is empty
const existingTripsCount = db.prepare('SELECT COUNT(*) AS n FROM travel_trips').get().n;
if (existingTripsCount === 0) {
  const tripSeeds = [
    { name: 'Promus IC Meeting - NYC', start_date: '2026-04-08', end_date: '2026-04-09', primary_location: 'New York, NY', purpose: 'business', status: 'planned', attendees: 'Mike, John', notes: 'Partner meeting', budget_usd: 1500 },
    { name: 'Family Vacation - Hawaii', start_date: '2026-07-15', end_date: '2026-07-22', primary_location: 'Honolulu, HI', purpose: 'vacation', status: 'planned', attendees: 'Mike, Paige, Kids', notes: 'Annual beach trip', budget_usd: 8000 },
  ];
  const insertTrip = db.prepare(`
    INSERT INTO travel_trips (name, start_date, end_date, primary_location, purpose, status, attendees, notes, budget_usd)
    VALUES (@name, @start_date, @end_date, @primary_location, @purpose, @status, @attendees, @notes, @budget_usd)
  `);
  const txTrips = db.transaction((rows) => rows.forEach((r) => insertTrip.run(r)));
  txTrips(tripSeeds);
}

// ── TASK HELPERS ──────────────────────────────────────────────────────
const tasks = {
  all: () => db.prepare('SELECT * FROM tasks ORDER BY updated DESC').all(),
  get: (id) => db.prepare('SELECT * FROM tasks WHERE id = ?').get(id),
  create: (data) => {
    const stmt = db.prepare(`
      INSERT INTO tasks (title, notes, status, assignee, priority)
      VALUES (@title, @notes, @status, @assignee, @priority)
    `);
    const r = stmt.run({ title:'', notes:'', status:'todo', assignee:'alden', priority:'normal', ...data });
    return tasks.get(r.lastInsertRowid);
  },
  update: (id, data) => {
    const allowed = ['title','notes','status','assignee','priority'];
    const fields = Object.keys(data).filter(k => allowed.includes(k));
    if (!fields.length) return tasks.get(id);
    const set = fields.map(f => `${f} = @${f}`).join(', ');
    db.prepare(`UPDATE tasks SET ${set}, updated = datetime('now') WHERE id = @id`)
      .run({ ...data, id });
    return tasks.get(id);
  },
  delete: (id) => db.prepare('DELETE FROM tasks WHERE id = ?').run(id)
};

// ── CALENDAR HELPERS ──────────────────────────────────────────────────
const calendar = {
  all: () => db.prepare('SELECT * FROM calendar_events ORDER BY scheduled ASC').all(),
  create: (data) => {
    const stmt = db.prepare(`
      INSERT INTO calendar_events (title, description, event_type, scheduled, recurrence, source)
      VALUES (@title, @description, @event_type, @scheduled, @recurrence, @source)
    `);
    const r = stmt.run({ title:'', description:'', event_type:'cron', scheduled:'', recurrence:'', source:'manual', ...data });
    return db.prepare('SELECT * FROM calendar_events WHERE id = ?').get(r.lastInsertRowid);
  },
  update: (id, data) => {
    const allowed = ['title','description','event_type','scheduled','recurrence','status','source'];
    const fields = Object.keys(data).filter(k => allowed.includes(k));
    if (!fields.length) return;
    const set = fields.map(f => `${f} = @${f}`).join(', ');
    db.prepare(`UPDATE calendar_events SET ${set} WHERE id = @id`).run({ ...data, id });
    return db.prepare('SELECT * FROM calendar_events WHERE id = ?').get(id);
  },
  delete: (id) => db.prepare('DELETE FROM calendar_events WHERE id = ?').run(id)
};

const vc = {
  knowledgeAll: () => db.prepare('SELECT * FROM vc_knowledge ORDER BY created DESC').all(),
  knowledgeCreate: (data) => {
    const stmt = db.prepare(`
      INSERT INTO vc_knowledge (title, content, source, tags)
      VALUES (@title, @content, @source, @tags)
    `);
    const r = stmt.run({ title:'', content:'', source:'manual', tags:'', ...data });
    return db.prepare('SELECT * FROM vc_knowledge WHERE id = ?').get(r.lastInsertRowid);
  },
  knowledgeSearch: (query, limit = 5) => {
    const q = `%${query}%`;
    return db.prepare(`
      SELECT * FROM vc_knowledge
      WHERE title LIKE ? OR content LIKE ? OR tags LIKE ?
      ORDER BY created DESC
      LIMIT ?
    `).all(q, q, q, limit);
  },
  sessionCreateOrGet: ({ company = 'Unknown', stage = '' }) => {
    const existing = db.prepare(`
      SELECT * FROM vc_sessions
      WHERE company = ? AND stage = ? AND status = 'active'
      ORDER BY updated DESC LIMIT 1
    `).get(company, stage);
    if (existing) return existing;
    const r = db.prepare(`INSERT INTO vc_sessions (company, stage) VALUES (?, ?)`).run(company, stage);
    return db.prepare('SELECT * FROM vc_sessions WHERE id = ?').get(r.lastInsertRowid);
  },
  addMessage: (sessionId, role, content) => {
    db.prepare(`INSERT INTO vc_session_messages (session_id, role, content) VALUES (?, ?, ?)`).run(sessionId, role, content);
    db.prepare(`UPDATE vc_sessions SET updated = datetime('now') WHERE id = ?`).run(sessionId);
  },
  recentMessages: (sessionId, limit = 6) => db.prepare(`
    SELECT * FROM vc_session_messages WHERE session_id = ? ORDER BY id DESC LIMIT ?
  `).all(sessionId, limit).reverse()
};

const pipeline = {
  all: () => db.prepare('SELECT * FROM promus_deals ORDER BY updated DESC').all(),
  get: (id) => db.prepare('SELECT * FROM promus_deals WHERE id = ?').get(id),
  create: (data) => {
    const stmt = db.prepare(`
      INSERT INTO promus_deals (company, stage, sector, lead, owner, status, probability, check_size_usd, target_close_date, next_step, memo_status, notes, source)
      VALUES (@company, @stage, @sector, @lead, @owner, @status, @probability, @check_size_usd, @target_close_date, @next_step, @memo_status, @notes, @source)
    `);
    const r = stmt.run({
      company: '',
      stage: '',
      sector: '',
      lead: '',
      owner: 'mike',
      status: 'sourcing',
      probability: 10,
      check_size_usd: 0,
      target_close_date: '',
      next_step: '',
      memo_status: 'not-started',
      notes: '',
      source: 'manual',
      ...data,
    });
    return pipeline.get(r.lastInsertRowid);
  },
  update: (id, data) => {
    const allowed = ['company', 'stage', 'sector', 'lead', 'owner', 'status', 'probability', 'check_size_usd', 'target_close_date', 'next_step', 'memo_status', 'notes', 'source', 'city', 'valuation', 'round_stage', 'investors', 'inbound_type', 'intake_date', 'email_content', 'research_summary', 'amount_raising'];
    const fields = Object.keys(data).filter((k) => allowed.includes(k));
    if (!fields.length) return pipeline.get(id);
    const set = fields.map((f) => `${f} = @${f}`).join(', ');
    db.prepare(`UPDATE promus_deals SET ${set}, updated = datetime('now') WHERE id = @id`).run({ ...data, id });
    return pipeline.get(id);
  },
  delete: (id) => db.prepare('DELETE FROM promus_deals WHERE id = ?').run(id),
  summary: () => {
    const totalDeals = db.prepare('SELECT COUNT(*) AS n FROM promus_deals').get().n;
    const weightedPipelineUsd = db.prepare('SELECT COALESCE(SUM((check_size_usd * probability) / 100.0), 0) AS v FROM promus_deals').get().v;
    const byStatus = db.prepare('SELECT status, COUNT(*) AS count FROM promus_deals GROUP BY status ORDER BY count DESC').all();
    return {
      totalDeals,
      weightedPipelineUsd: Math.round(weightedPipelineUsd),
      byStatus,
    };
  },
};

const team = {
  all: () => db.prepare('SELECT * FROM promus_team ORDER BY name ASC').all(),
  get: (id) => db.prepare('SELECT * FROM promus_team WHERE id = ?').get(id),
  create: (data) => {
    const stmt = db.prepare(`
      INSERT INTO promus_team (name, handle, role, focus, status, capacity_pct)
      VALUES (@name, @handle, @role, @focus, @status, @capacity_pct)
    `);
    const r = stmt.run({ name: '', handle: '', role: '', focus: '', status: 'active', capacity_pct: 100, ...data });
    return team.get(r.lastInsertRowid);
  },
  update: (id, data) => {
    const allowed = ['name', 'handle', 'role', 'focus', 'status', 'capacity_pct'];
    const fields = Object.keys(data).filter((k) => allowed.includes(k));
    if (!fields.length) return team.get(id);
    const set = fields.map((f) => `${f} = @${f}`).join(', ');
    db.prepare(`UPDATE promus_team SET ${set}, updated = datetime('now') WHERE id = @id`).run({ ...data, id });
    return team.get(id);
  },
  delete: (id) => db.prepare('DELETE FROM promus_team WHERE id = ?').run(id),
  workload: () => db.prepare(`
    SELECT
      t.id,
      t.name,
      t.handle,
      t.role,
      t.focus,
      t.status,
      t.capacity_pct,
      COALESCE(task_counts.open_tasks, 0) AS open_tasks,
      COALESCE(deal_counts.active_deals, 0) AS active_deals
    FROM promus_team t
    LEFT JOIN (
      SELECT assignee AS handle, COUNT(*) AS open_tasks
      FROM tasks
      WHERE status != 'done'
      GROUP BY assignee
    ) task_counts ON task_counts.handle = t.handle
    LEFT JOIN (
      SELECT owner AS handle, COUNT(*) AS active_deals
      FROM promus_deals
      WHERE status NOT IN ('pass', 'closed')
      GROUP BY owner
    ) deal_counts ON deal_counts.handle = t.handle
    ORDER BY t.name ASC
  `).all(),
};

// ── PROJECT DECISIONS HELPERS ─────────────────────────────────────────
const incomingDeals = {
  all: () => db.prepare('SELECT * FROM incoming_deals ORDER BY intake_date DESC, created DESC').all(),
  get: (id) => db.prepare('SELECT * FROM incoming_deals WHERE id = ?').get(id),
  create: (data) => {
    const stmt = db.prepare(`
      INSERT INTO incoming_deals (deal_name, company_name, city, amount_raising, valuation, industry, round_stage, investors, originated_by, inbound_type, source_email, source_channel, intake_date, notes, status)
      VALUES (@deal_name, @company_name, @city, @amount_raising, @valuation, @industry, @round_stage, @investors, @originated_by, @inbound_type, @source_email, @source_channel, @intake_date, @notes, @status)
    `);
    const r = stmt.run({
      deal_name: '', company_name: '', city: '', amount_raising: '', valuation: '', industry: '', round_stage: '', investors: '',
      originated_by: '', inbound_type: 'Other', source_email: '', source_channel: 'manual',
      intake_date: new Date().toISOString().slice(0,10), notes: '', status: 'new', ...data,
    });
    return incomingDeals.get(r.lastInsertRowid);
  },
  update: (id, data) => {
    const allowed = ['deal_name','company_name','city','amount_raising','valuation','industry','round_stage','investors','originated_by','inbound_type','source_email','source_channel','intake_date','notes','email_content','research_summary','researched','status','promoted_deal_id'];
    const fields = Object.keys(data).filter(k => allowed.includes(k));
    if (!fields.length) return incomingDeals.get(id);
    const set = fields.map(f => `${f} = @${f}`).join(', ');
    db.prepare(`UPDATE incoming_deals SET ${set}, updated = datetime('now') WHERE id = @id`).run({ ...data, id });
    return incomingDeals.get(id);
  },
  delete: (id) => db.prepare('DELETE FROM incoming_deals WHERE id = ?').run(id),
  promoteToPipeline: (id) => {
    const deal = incomingDeals.get(id);
    if (!deal) throw new Error('Incoming deal not found');
    const insert = db.prepare(`
      INSERT INTO promus_deals (
        company, stage, sector, lead, owner, status, probability, check_size_usd,
        notes, source, city, valuation, round_stage, investors, inbound_type,
        intake_date, email_content, research_summary, amount_raising
      ) VALUES (
        @company, @stage, @sector, @lead, @owner, @status, @probability, @check_size_usd,
        @notes, @source, @city, @valuation, @round_stage, @investors, @inbound_type,
        @intake_date, @email_content, @research_summary, @amount_raising
      )
    `);
    const checkSize = parseInt(String(deal.amount_raising || '').replace(/[^0-9]/g, ''), 10) || 0;
    const info = insert.run({
      company: deal.company_name || deal.deal_name,
      stage: deal.round_stage || '',
      sector: deal.industry || '',
      lead: (deal.originated_by || '').split('@')[0],
      owner: 'mike',
      status: 'sourcing',
      probability: 10,
      check_size_usd: checkSize,
      notes: deal.notes || '',
      source: `incoming:${deal.inbound_type || 'Other'}`,
      city: deal.city || '',
      valuation: deal.valuation || '',
      round_stage: deal.round_stage || '',
      investors: deal.investors || '',
      inbound_type: deal.inbound_type || '',
      intake_date: deal.intake_date || '',
      email_content: deal.email_content || '',
      research_summary: deal.research_summary || '',
      amount_raising: deal.amount_raising || '',
    });
    incomingDeals.update(id, { status: 'promoted', promoted_deal_id: info.lastInsertRowid });
    return { incoming: incomingDeals.get(id), pipeline: pipeline.get(info.lastInsertRowid) };
  },
};

const decisions = {
  all: (project) => {
    if (project) return db.prepare("SELECT * FROM project_decisions WHERE project = ? AND status = 'active' ORDER BY created DESC").all(project);
    return db.prepare("SELECT * FROM project_decisions WHERE status = 'active' ORDER BY project ASC, created DESC").all();
  },
  create: (data) => {
    const r = db.prepare(`
      INSERT INTO project_decisions (project, decision, rationale, decided_by)
      VALUES (@project, @decision, @rationale, @decided_by)
    `).run({ project: 'general', decision: '', rationale: '', decided_by: 'mike', ...data });
    return db.prepare('SELECT * FROM project_decisions WHERE id = ?').get(r.lastInsertRowid);
  },
  supersede: (id, replacement) => {
    db.prepare("UPDATE project_decisions SET status = 'superseded', superseded = datetime('now') WHERE id = ?").run(id);
    if (replacement) return decisions.create(replacement);
  },
  delete: (id) => db.prepare('DELETE FROM project_decisions WHERE id = ?').run(id),
};

// ── PROJECT BLOCKERS HELPERS ──────────────────────────────────────────
const blockers = {
  all: (project) => {
    if (project) return db.prepare("SELECT * FROM project_blockers WHERE project = ? ORDER BY status ASC, created DESC").all(project);
    return db.prepare("SELECT * FROM project_blockers ORDER BY status ASC, severity DESC, created DESC").all();
  },
  open: () => db.prepare("SELECT * FROM project_blockers WHERE status = 'open' ORDER BY severity DESC, created DESC").all(),
  create: (data) => {
    const r = db.prepare(`
      INSERT INTO project_blockers (project, blocker, severity, owner, notes)
      VALUES (@project, @blocker, @severity, @owner, @notes)
    `).run({ project: 'general', blocker: '', severity: 'medium', owner: 'mike', notes: '', ...data });
    return db.prepare('SELECT * FROM project_blockers WHERE id = ?').get(r.lastInsertRowid);
  },
  resolve: (id, notes) => {
    db.prepare("UPDATE project_blockers SET status = 'resolved', resolved_at = datetime('now'), notes = COALESCE(@notes, notes) WHERE id = @id").run({ id, notes: notes || null });
    return db.prepare('SELECT * FROM project_blockers WHERE id = ?').get(id);
  },
  delete: (id) => db.prepare('DELETE FROM project_blockers WHERE id = ?').run(id),
};

// ── PODCASTS ──────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS podcasts (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    show_name     TEXT NOT NULL,
    episode_title TEXT NOT NULL,
    guest         TEXT DEFAULT '',
    host          TEXT DEFAULT '',
    date_published TEXT DEFAULT '',
    duration_mins INTEGER DEFAULT 0,
    url           TEXT DEFAULT '',
    notes_url     TEXT DEFAULT '',
    summary       TEXT DEFAULT '',
    key_takeaways TEXT DEFAULT '',
    transcript    TEXT DEFAULT '',
    tags          TEXT DEFAULT '',
    status        TEXT DEFAULT 'want-to-watch',
    mike_notes    TEXT DEFAULT '',
    added_by      TEXT DEFAULT 'Mike',
    created       TEXT DEFAULT (datetime('now')),
    updated       TEXT DEFAULT (datetime('now'))
  );
`);

const podcasts = {
  all: () => db.prepare('SELECT * FROM podcasts ORDER BY created DESC, id DESC').all(),
  get: (id) => db.prepare('SELECT * FROM podcasts WHERE id = ?').get(id),
  create: (data) => {
    const r = db.prepare(`
      INSERT INTO podcasts (show_name, episode_title, guest, host, date_published, duration_mins, url, notes_url, summary, key_takeaways, transcript, tags, status, mike_notes, added_by, promus_portfolio)
      VALUES (@show_name, @episode_title, @guest, @host, @date_published, @duration_mins, @url, @notes_url, @summary, @key_takeaways, @transcript, @tags, @status, @mike_notes, @added_by, @promus_portfolio)
    `).run({ show_name:'', episode_title:'', guest:'', host:'', date_published:'', duration_mins:0, url:'', notes_url:'', summary:'', key_takeaways:'', transcript:'', tags:'', status:'want-to-watch', mike_notes:'', added_by:'Mike', promus_portfolio:0, ...data });
    return db.prepare('SELECT * FROM podcasts WHERE id = ?').get(r.lastInsertRowid);
  },
  update: (id, data) => {
    const fields = Object.keys(data).map(k => `${k} = @${k}`).join(', ');
    db.prepare(`UPDATE podcasts SET ${fields}, updated = datetime('now') WHERE id = @id`).run({ ...data, id });
    return db.prepare('SELECT * FROM podcasts WHERE id = ?').get(id);
  },
  delete: (id) => db.prepare('DELETE FROM podcasts WHERE id = ?').run(id),
};

// ── ARTICLES ──────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS articles (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    title         TEXT NOT NULL,
    author        TEXT DEFAULT '',
    source        TEXT DEFAULT '',
    url           TEXT DEFAULT '',
    date_published TEXT DEFAULT '',
    date_added    TEXT DEFAULT (datetime('now')),
    summary       TEXT DEFAULT '',
    key_takeaways TEXT DEFAULT '',
    mike_notes    TEXT DEFAULT '',
    tags          TEXT DEFAULT '',
    status        TEXT DEFAULT 'saved',
    created       TEXT DEFAULT (datetime('now')),
    updated       TEXT DEFAULT (datetime('now'))
  )
`);

const articles = {
  all: () => db.prepare('SELECT * FROM articles ORDER BY created DESC').all(),
  get: (id) => db.prepare('SELECT * FROM articles WHERE id = ?').get(id),
  create: (data) => {
    const r = db.prepare(`
      INSERT INTO articles (title, author, source, url, date_published, summary, key_takeaways, mike_notes, tags, status)
      VALUES (@title, @author, @source, @url, @date_published, @summary, @key_takeaways, @mike_notes, @tags, @status)
    `).run(data);
    return db.prepare('SELECT * FROM articles WHERE id = ?').get(r.lastInsertRowid);
  },
  update: (id, data) => {
    const fields = Object.keys(data).map(k => `${k} = @${k}`).join(', ');
    db.prepare(`UPDATE articles SET ${fields}, updated = datetime('now') WHERE id = @id`).run({ ...data, id });
    return db.prepare('SELECT * FROM articles WHERE id = ?').get(id);
  },
  delete: (id) => db.prepare('DELETE FROM articles WHERE id = ?').run(id),
};

// ── AGENT ROI ─────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS roi_log (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    date          TEXT DEFAULT (date('now')),
    agent         TEXT DEFAULT 'Alden',
    category      TEXT DEFAULT 'General',
    description   TEXT NOT NULL,
    mins_saved    INTEGER DEFAULT 0,
    token_cost_usd REAL DEFAULT 0,
    value_usd     REAL DEFAULT 0,
    created       TEXT DEFAULT (datetime('now'))
  )
`);

const roi = {
  all: () => db.prepare('SELECT * FROM roi_log ORDER BY created DESC').all(),
  get: (id) => db.prepare('SELECT * FROM roi_log WHERE id = ?').get(id),
  create: (data) => {
    const r = db.prepare(`
      INSERT INTO roi_log (date, agent, category, description, mins_saved, token_cost_usd, value_usd)
      VALUES (@date, @agent, @category, @description, @mins_saved, @token_cost_usd, @value_usd)
    `).run({ date: new Date().toISOString().slice(0,10), agent:'Alden', category:'General', description:'', mins_saved:0, token_cost_usd:0, value_usd:0, ...data });
    return db.prepare('SELECT * FROM roi_log WHERE id = ?').get(r.lastInsertRowid);
  },
  update: (id, data) => {
    const fields = Object.keys(data).map(k => `${k} = @${k}`).join(', ');
    db.prepare(`UPDATE roi_log SET ${fields} WHERE id = @id`).run({ ...data, id });
    return db.prepare('SELECT * FROM roi_log WHERE id = ?').get(id);
  },
  delete: (id) => db.prepare('DELETE FROM roi_log WHERE id = ?').run(id),
  stats: () => {
    const rows = db.prepare('SELECT * FROM roi_log').all();
    const total_mins = rows.reduce((s,r) => s + (r.mins_saved||0), 0);
    const total_cost = rows.reduce((s,r) => s + (r.token_cost_usd||0), 0);
    const total_value = rows.reduce((s,r) => s + (r.value_usd||0), 0);
    const by_category = {};
    rows.forEach(r => {
      if (!by_category[r.category]) by_category[r.category] = { mins:0, cost:0, value:0, count:0 };
      by_category[r.category].mins += r.mins_saved||0;
      by_category[r.category].cost += r.token_cost_usd||0;
      by_category[r.category].value += r.value_usd||0;
      by_category[r.category].count++;
    });
    return { total_mins, total_cost, total_value, roi_ratio: total_cost > 0 ? (total_value/total_cost).toFixed(1) : 'N/A', by_category, count: rows.length };
  }
};

// Personal + PV Todos
db.prepare(`CREATE TABLE IF NOT EXISTS todos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  list TEXT NOT NULL DEFAULT 'personal',
  text TEXT NOT NULL,
  notes TEXT DEFAULT '',
  priority TEXT DEFAULT 'normal',
  status TEXT DEFAULT 'open',
  due_date TEXT DEFAULT '',
  created TEXT DEFAULT (datetime('now')),
  updated TEXT DEFAULT (datetime('now'))
)`).run();

const todos = {
  all: (list) => db.prepare(`SELECT * FROM todos WHERE list = ? ORDER BY
    CASE status WHEN 'open' THEN 0 WHEN 'done' THEN 1 END,
    CASE priority WHEN 'high' THEN 0 WHEN 'normal' THEN 1 WHEN 'low' THEN 2 END,
    created DESC`).all(list),
  get: (id) => db.prepare('SELECT * FROM todos WHERE id = ?').get(id),
  create: (list, text, notes, priority, due_date) => {
    const r = db.prepare('INSERT INTO todos (list, text, notes, priority, due_date) VALUES (?,?,?,?,?)').run(list, text, notes||'', priority||'normal', due_date||'');
    return db.prepare('SELECT * FROM todos WHERE id = ?').get(r.lastInsertRowid);
  },
  update: (id, fields) => {
    const allowed = ['text','notes','priority','status','due_date'];
    const sets = Object.keys(fields).filter(k => allowed.includes(k)).map(k => `${k} = ?`);
    if (!sets.length) return;
    sets.push("updated = datetime('now')");
    db.prepare(`UPDATE todos SET ${sets.join(', ')} WHERE id = ?`).run(...Object.keys(fields).filter(k => allowed.includes(k)).map(k => fields[k]), id);
    return db.prepare('SELECT * FROM todos WHERE id = ?').get(id);
  },
  delete: (id) => db.prepare('DELETE FROM todos WHERE id = ?').run(id)
};

// ── TRAVEL HELPERS ───────────────────────────────────────────────────
const travel = {
  all: () => db.prepare('SELECT * FROM travel_trips ORDER BY start_date ASC').all(),
  get: (id) => db.prepare('SELECT * FROM travel_trips WHERE id = ?').get(id),
  create: (data) => {
    const stmt = db.prepare(`
      INSERT INTO travel_trips (name, start_date, end_date, primary_location, purpose, status, attendees, notes, budget_usd)
      VALUES (@name, @start_date, @end_date, @primary_location, @purpose, @status, @attendees, @notes, @budget_usd)
    `);
    const r = stmt.run({
      name: '',
      start_date: '',
      end_date: '',
      primary_location: '',
      purpose: 'business',
      status: 'planned',
      attendees: '',
      notes: '',
      budget_usd: 0,
      ...data,
    });
    return travel.get(r.lastInsertRowid);
  },
  update: (id, data) => {
    const allowed = ['name', 'start_date', 'end_date', 'primary_location', 'purpose', 'status', 'attendees', 'notes', 'budget_usd', 'research_notes'];
    const fields = Object.keys(data).filter((k) => allowed.includes(k));
    if (!fields.length) return travel.get(id);
    const set = fields.map((f) => `${f} = @${f}`).join(', ');
    db.prepare(`UPDATE travel_trips SET ${set}, updated = datetime('now') WHERE id = @id`).run({ ...data, id });
    return travel.get(id);
  },
  delete: (id) => db.prepare('DELETE FROM travel_trips WHERE id = ?').run(id),
  upcoming: () => {
    const today = new Date().toISOString().slice(0, 10);
    return db.prepare('SELECT * FROM travel_trips WHERE start_date >= ? ORDER BY start_date ASC').all(today);
  },
};

// ── RESEARCH HISTORY ─────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS research_history (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    query   TEXT NOT NULL,
    result  TEXT DEFAULT '',
    status  TEXT DEFAULT 'pending',
    created TEXT DEFAULT (datetime('now'))
  );
`);

const research = {
  all:    ()       => db.prepare('SELECT id, query, status, created FROM research_history ORDER BY created DESC').all(),
  get:    (id)     => db.prepare('SELECT * FROM research_history WHERE id = ?').get(id),
  create: (query)  => {
    const r = db.prepare('INSERT INTO research_history (query, status) VALUES (?, ?)').run(query, 'running');
    return research.get(r.lastInsertRowid);
  },
  update: (id, data) => {
    const allowed = ['result', 'status'];
    const fields = Object.keys(data).filter(k => allowed.includes(k));
    if (!fields.length) return research.get(id);
    const set = fields.map(f => `${f} = @${f}`).join(', ');
    db.prepare(`UPDATE research_history SET ${set} WHERE id = @id`).run({ ...data, id });
    return research.get(id);
  },
  delete: (id) => db.prepare('DELETE FROM research_history WHERE id = ?').run(id),
};

module.exports = { db, tasks, calendar, vc, pipeline, team, incomingDeals, decisions, blockers, podcasts, articles, roi, todos, travel, research };
