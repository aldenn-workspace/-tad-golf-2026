const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');
const Anthropic = require('@anthropic-ai/sdk');
const db = require('./db');

// ── FX RATES (Feature 4) ──────────────────────────────────────────────────────
const FX_RATES = { USD: 1, EUR: 1.08, GBP: 1.27, CAD: 0.73, AUD: 0.64, CHF: 1.13, JPY: 0.0067, Other: 1 };
function toUSD(amount, currency) { return amount * (FX_RATES[currency] || 1); }

const app = express();
const PORT = 3463;
const ANTHROPIC_KEY = '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';
const TELEGRAM_TOKEN = '8395890971:AAHwb27dmD9SWCIfyvOToU5TXfMVAt-3aDo';
const MIKE_CHAT_ID = '8345634392';

const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY });

const FUNDS = ['GP','PVI','PVII','PVIII','PVE','OV I','PV Halter','PV Whoop','PV Chef','PV5'];
const EXPENSE_TYPES = ['GP Expense','LP Expense','Fund Organizational'];
const CATEGORIES = ['Travel','Legal','Meals','Accounting','Back Office','Office','Subscription Services','Health Care','AI','Other'];

// ── TELEGRAM HELPER ───────────────────────────────────────────────────────────
async function sendTelegram(chatId, text) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' })
    });
    return res.ok;
  } catch(e) { console.error('Telegram error:', e.message); return false; }
}

// ── MULTER ────────────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, 'uploads')),
  filename: (req, file, cb) => {
    const ts = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `receipt-${ts}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

// ── MIDDLEWARE ────────────────────────────────────────────────────────────────
app.set('trust proxy', 1);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public'), { index: false }));
const isHttps = process.env.HTTPS_PROXY === 'true' || false;
app.use(session({
  secret: 'pv-expenses-secret-2026',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000, sameSite: 'lax', secure: false } // 7 days
}));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── AUTH MIDDLEWARE ───────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) return next();
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Not authenticated' });
  res.redirect('/login');
}
function requireAdmin(req, res, next) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  if (user && user.role === 'admin') return next();
  res.status(403).json({ error: 'Admin only' });
}

// ── LOGIN PAGE ────────────────────────────────────────────────────────────────
app.get('/login', (req, res) => {
  if (req.session.userId) return res.redirect('/');
  res.sendFile('login.html', { root: path.join(__dirname, 'public') });
});

app.post('/api/login', (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password required' });
  const user = db.prepare('SELECT * FROM users WHERE password = ? AND active = 1').get(password);
  if (!user) return res.status(401).json({ error: 'Invalid password or account not active' });
  req.session.userId = user.id;
  res.json({ ok: true, user: { id: user.id, name: user.name, role: user.role } });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ ok: true });
});

app.get('/api/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, name, role, active, telegram_chat_id, email FROM users WHERE id = ?').get(req.session.userId);
  res.json(user);
});

// ── MAIN APP (auth required) ───────────────────────────────────────────────────
app.get('/', requireAuth, (req, res) => {
  res.sendFile('index.html', { root: path.join(__dirname, 'public') });
});

// ── HEALTH ────────────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  const count = db.prepare('SELECT COUNT(*) as n FROM expenses').get();
  res.json({ status: 'ok', service: 'pv-expenses', expenses: count.n });
});

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
app.get('/api/constants', requireAuth, (req, res) => {
  res.json({ funds: FUNDS, expense_types: EXPENSE_TYPES, categories: CATEGORIES });
});

// ── USERS (admin only) ────────────────────────────────────────────────────────
app.get('/api/users', requireAuth, requireAdmin, (req, res) => {
  res.json(db.prepare('SELECT id, name, role, active, telegram_chat_id, email FROM users ORDER BY id').all());
});

app.put('/api/users/:id', requireAuth, requireAdmin, (req, res) => {
  const { active, password } = req.body;
  if (active !== undefined) db.prepare('UPDATE users SET active = ? WHERE id = ?').run(active ? 1 : 0, req.params.id);
  if (password) db.prepare('UPDATE users SET password = ? WHERE id = ?').run(password, req.params.id);
  res.json({ ok: true });
});

// ── EXPENSES CRUD ─────────────────────────────────────────────────────────────
app.get('/api/expenses', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  const { fund, type, category, year, user_id } = req.query;

  let sql = `SELECT e.*, u.name as user_name, r.title as report_title FROM expenses e JOIN users u ON e.user_id = u.id LEFT JOIN reports r ON e.report_id = r.id WHERE 1=1`;
  const params = [];

  // Non-admins only see their own
  if (user.role !== 'admin') {
    sql += ' AND e.user_id = ?'; params.push(user.id);
  } else if (user_id) {
    sql += ' AND e.user_id = ?'; params.push(user_id);
  }

  if (fund)     { sql += ' AND e.fund = ?';         params.push(fund); }
  if (type)     { sql += ' AND e.expense_type = ?'; params.push(type); }
  if (category) { sql += ' AND e.category = ?';     params.push(category); }
  if (year)     { sql += ` AND strftime('%Y',e.date) = ?`; params.push(year); }
  sql += ' ORDER BY e.date DESC, e.id DESC';
  const rows = db.prepare(sql).all(...params);
  // Feature 4: add amount_usd; Feature 5: add split count
  const splitCounts = db.prepare(`SELECT expense_id, COUNT(*) as cnt FROM expense_splits GROUP BY expense_id`).all();
  const splitMap = {};
  splitCounts.forEach(s => { splitMap[s.expense_id] = s.cnt; });
  rows.forEach(r => {
    r.amount_usd = toUSD(r.amount, r.currency);
    r.split_count = splitMap[r.id] || 0;
  });
  res.json(rows);
});

app.get('/api/expenses/:id', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  const row = db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  if (user.role !== 'admin' && row.user_id !== user.id) return res.status(403).json({ error: 'Forbidden' });
  res.json(row);
});

app.post('/api/expenses', requireAuth, (req, res) => {
  const userId = req.session.userId;
  const { date, vendor, amount, currency, fund, expense_type, category,
          description, receipt_path, receipt_filename, ai_extracted,
          ai_line_items, reimbursable, notes, report_id, payment_method } = req.body;
  if (!date || !vendor || !amount || !fund || !expense_type || !category)
    return res.status(400).json({ error: 'Missing required fields' });
  const result = db.prepare(`
    INSERT INTO expenses (user_id,report_id,date,vendor,amount,currency,fund,expense_type,category,
      description,receipt_path,receipt_filename,ai_extracted,ai_line_items,reimbursable,notes,payment_method)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(userId, report_id||null, date, vendor, parseFloat(amount), currency||'USD', fund, expense_type, category,
         description||'', receipt_path||null, receipt_filename||null,
         ai_extracted?1:0, ai_line_items||null, reimbursable?1:0, notes||'', payment_method||null);
  res.json({ id: result.lastInsertRowid });
});

app.put('/api/expenses/:id', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  const existing = db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  if (user.role !== 'admin' && existing.user_id !== user.id) return res.status(403).json({ error: 'Forbidden' });
  const { date, vendor, amount, currency, fund, expense_type, category,
          description, receipt_path, receipt_filename, ai_extracted,
          ai_line_items, reimbursable, notes, report_id, payment_method } = req.body;
  db.prepare(`
    UPDATE expenses SET date=?,vendor=?,amount=?,currency=?,fund=?,expense_type=?,
      category=?,description=?,receipt_path=?,receipt_filename=?,ai_extracted=?,
      ai_line_items=?,reimbursable=?,notes=?,report_id=?,payment_method=?,updated_at=datetime('now')
    WHERE id=?
  `).run(date, vendor, parseFloat(amount), currency||'USD', fund, expense_type, category,
         description||'', receipt_path||null, receipt_filename||null,
         ai_extracted?1:0, ai_line_items||null, reimbursable?1:0, notes||'', report_id||null, payment_method||null, req.params.id);
  res.json({ ok: true });
});

app.delete('/api/expenses/:id', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  const existing = db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  if (user.role !== 'admin' && existing.user_id !== user.id) return res.status(403).json({ error: 'Forbidden' });
  db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ── REPORTS ───────────────────────────────────────────────────────────────────
app.get('/api/reports', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  let sql = `SELECT r.*, u.name as user_name FROM reports r JOIN users u ON r.user_id = u.id`;
  if (user.role !== 'admin') sql += ` WHERE r.user_id = ${user.id}`;
  sql += ` ORDER BY r.created_at DESC`;
  const reports = db.prepare(sql).all();
  // Attach expenses to each report
  reports.forEach(r => {
    r.expenses = db.prepare('SELECT * FROM expenses WHERE report_id = ? ORDER BY date DESC').all(r.id);
    r.total = r.expenses.reduce((s, e) => s + e.amount, 0);
  });
  res.json(reports);
});

app.post('/api/reports', requireAuth, (req, res) => {
  const userId = req.session.userId;
  const { title, date_from, date_to } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  const result = db.prepare(`INSERT INTO reports (user_id, title, date_from, date_to, status) VALUES (?,?,?,?,'draft')`).run(userId, title, date_from||'', date_to||'');
  res.json({ id: result.lastInsertRowid });
});

// Assign or unassign an expense to a report
app.patch('/api/expenses/:id/report', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id);
  if (!expense) return res.status(404).json({ error: 'Not found' });
  if (user.role !== 'admin' && expense.user_id !== user.id) return res.status(403).json({ error: 'Forbidden' });
  const { report_id } = req.body; // null to unassign
  // Block moves if expense is already in a locked (non-draft) report
  if (expense.report_id) {
    const currentReport = db.prepare('SELECT status FROM reports WHERE id = ?').get(expense.report_id);
    if (currentReport && currentReport.status !== 'draft') {
      return res.status(400).json({ error: 'Expense is locked in a submitted report and cannot be moved.' });
    }
  }
  db.prepare('UPDATE expenses SET report_id = ?, updated_at = datetime(\'now\') WHERE id = ?').run(report_id || null, expense.id);
  // Recalculate report total if assigning/unassigning
  const targetId = report_id || expense.report_id;
  if (targetId) {
    const total = db.prepare('SELECT COALESCE(SUM(amount),0) as t FROM expenses WHERE report_id = ?').get(targetId).t;
    db.prepare('UPDATE reports SET total = ? WHERE id = ?').run(total, targetId);
  }
  res.json({ ok: true });
});

app.get('/api/reports/:id', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  const report = db.prepare('SELECT r.*, u.name as user_name FROM reports r JOIN users u ON r.user_id = u.id WHERE r.id = ?').get(req.params.id);
  if (!report) return res.status(404).json({ error: 'Not found' });
  if (user.role !== 'admin' && report.user_id !== user.id) return res.status(403).json({ error: 'Forbidden' });
  const expenses = db.prepare('SELECT * FROM expenses WHERE report_id = ? ORDER BY date DESC').all(req.params.id);
  res.json({ ...report, expenses });
});

// Rename a draft report
app.patch('/api/reports/:id', requireAuth, (req, res) => {
  const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(req.params.id);
  if (!report) return res.status(404).json({ error: 'Not found' });
  if (report.status !== 'draft') return res.status(400).json({ error: 'Cannot rename a submitted report.' });
  const { title } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ error: 'Title required.' });
  db.prepare('UPDATE reports SET title = ? WHERE id = ?').run(title.trim(), report.id);
  res.json({ ok: true });
});

// Submit report for approval
app.post('/api/reports/:id/submit', requireAuth, async (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(req.params.id);
  if (!report) return res.status(404).json({ error: 'Not found' });
  if (report.user_id !== user.id) return res.status(403).json({ error: 'Forbidden' });
  if (report.status !== 'draft') return res.status(400).json({ error: 'Already submitted' });

  const RECEIPT_EXEMPT_CATEGORIES = ['Mileage', 'Per Diem'];
  const reportExpenses = db.prepare('SELECT * FROM expenses WHERE report_id = ? ORDER BY date DESC').all(report.id);
  if (reportExpenses.length === 0) return res.status(400).json({ error: 'No expenses added to this report yet. Add expenses from the Expenses tab first.' });
  const missingReceipts = reportExpenses.filter(e => e.amount >= 75 && !e.receipt_filename && !RECEIPT_EXEMPT_CATEGORIES.includes(e.category));
  if (missingReceipts.length) {
    const names = missingReceipts.map(e => `${e.vendor} ($${e.amount.toFixed(2)})`).join(', ');
    return res.status(400).json({ error: `Cannot submit: ${missingReceipts.length} expense(s) over $75 are missing receipts: ${names}` });
  }
  const total = reportExpenses.reduce((s, e) => s + e.amount, 0);
  db.prepare(`UPDATE reports SET status='submitted', submitted_at=datetime('now'), total=? WHERE id=?`).run(total, report.id);

  // Send Telegram to Mike (Feature 1: improved notification)
  const lines = reportExpenses.map(e => `  • ${e.date} — ${e.vendor} — $${e.amount.toFixed(2)} (${e.fund})`).join('\n');
  const msg = `💼 <b>Expense Report Submitted</b>\n\n` +
    `👤 <b>${user.name}</b>\n` +
    `📋 <b>${report.title}</b>\n` +
    `💰 Total: <b>$${total.toFixed(2)}</b> · ${reportExpenses.length} expense${reportExpenses.length !== 1 ? 's' : ''}\n\n` +
    `${lines}\n\n` +
    `🔍 Review at:\n` +
    `• http://localhost:3463\n` +
    `• https://mcs-mac-mini-1.tail145633.ts.net:3463`;
  await sendTelegram(MIKE_CHAT_ID, msg);

  res.json({ ok: true, total, count: reportExpenses.length });
});

// Approve or reject report
app.post('/api/reports/:id/review', requireAuth, requireAdmin, async (req, res) => {
  const { action, notes, rejection_reason } = req.body; // action: 'approve' | 'reject'
  if (action === 'reject' && !rejection_reason?.trim())
    return res.status(400).json({ error: 'A rejection reason is required.' });

  const report = db.prepare('SELECT r.*, u.name as user_name, u.telegram_chat_id as employee_tg FROM reports r JOIN users u ON r.user_id = u.id WHERE r.id = ?').get(req.params.id);
  if (!report) return res.status(404).json({ error: 'Not found' });

  const status = action === 'approve' ? 'approved' : 'rejected';
  db.prepare(`UPDATE reports SET status=?, reviewed_at=datetime('now'), reviewer_id=?, reviewer_notes=?, rejection_reason=? WHERE id=?`)
    .run(status, req.session.userId, notes||'', action === 'reject' ? rejection_reason : null, req.params.id);

  // Notify employee via Telegram if they have a chat ID configured
  if (report.employee_tg) {
    const emoji = action === 'approve' ? '✅' : '❌';
    const msg = action === 'approve'
      ? `✅ <b>Expense Report Approved</b>\n\n📋 <b>${report.title}</b>\n💰 $${report.total.toFixed(2)}\n\nMike approved your report.`
      : `❌ <b>Expense Report Rejected</b>\n\n📋 <b>${report.title}</b>\n💰 $${report.total.toFixed(2)}\n\n<b>Reason:</b> ${rejection_reason}\n\n${notes ? `<b>Notes:</b> ${notes}\n\n` : ''}Please update and resubmit at the expense portal.`;
    await sendTelegram(report.employee_tg, msg);
  }

  res.json({ ok: true, status });
});

app.delete('/api/reports/:id', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(req.params.id);
  if (!report) return res.status(404).json({ error: 'Not found' });
  if (user.role !== 'admin' && report.user_id !== user.id) return res.status(403).json({ error: 'Forbidden' });
  if (report.status === 'approved') return res.status(400).json({ error: 'Cannot delete approved report' });
  // Unlink expenses
  db.prepare('UPDATE expenses SET report_id = NULL WHERE report_id = ?').run(report.id);
  db.prepare('DELETE FROM reports WHERE id = ?').run(report.id);
  res.json({ ok: true });
});

// ── RECEIPT SCAN ──────────────────────────────────────────────────────────────
app.post('/api/scan', requireAuth, upload.single('receipt'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const filePath = req.file.path;
  const fileName = req.file.filename;
  const mimeType = req.file.mimetype;
  try {
    const fileData = fs.readFileSync(filePath);
    const base64 = fileData.toString('base64');
    const isImage = mimeType.startsWith('image/');
    const isPDF = mimeType === 'application/pdf';
    if (!isImage && !isPDF) return res.status(400).json({ error: 'Only images and PDFs supported' });

    const prompt = `Extract expense data from this receipt/invoice. Return ONLY valid JSON:
{"vendor":"merchant name","date":"YYYY-MM-DD","amount":0.00,"currency":"USD","line_items":[{"description":"","amount":0.00}],"category_hint":"one of: Travel,Legal,Meals,Accounting,Back Office,Office,Subscription Services,Health Care,Other"}
Use null for unknown fields.`;

    const content = isImage
      ? [{ type:'image', source:{ type:'base64', media_type:mimeType, data:base64 } }, { type:'text', text:prompt }]
      : [{ type:'document', source:{ type:'base64', media_type:'application/pdf', data:base64 } }, { type:'text', text:prompt }];

    const message = await anthropic.messages.create({ model:'claude-opus-4-5', max_tokens:1024, messages:[{ role:'user', content }] });
    const raw = message.content[0].text.trim().replace(/^```json\s*/,'').replace(/```$/,'').trim();
    const extracted = JSON.parse(raw);
    res.json({ ok:true, file_path:filePath, file_name:fileName, extracted });
  } catch(err) {
    console.error('Scan error:', err);
    res.json({ ok:true, file_path:filePath, file_name:fileName, extracted:null, error:'AI extraction failed — fill in manually' });
  }
});

// ── STATS ─────────────────────────────────────────────────────────────────────
app.get('/api/stats', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  const { year } = req.query;
  const userFilter = user.role !== 'admin' ? `AND user_id = ${user.id}` : '';
  const yearFilter = year ? `AND strftime('%Y',date) = '${year}'` : '';
  const where = `WHERE 1=1 ${userFilter} ${yearFilter}`;

  // Feature 4: compute USD totals by fetching raw rows and converting
  const allRawWhere = where.replace(/\bexpenses\b\./g, 'e.').replace('WHERE 1=1', 'WHERE 1=1');
  const allRaw = db.prepare(`SELECT e.amount, e.currency, e.fund, e.expense_type, e.category, e.user_id, u.name as user_name FROM expenses e JOIN users u ON e.user_id = u.id ${allRawWhere}`).all();
  const totalUSD = allRaw.reduce((s,r) => s + toUSD(r.amount, r.currency), 0);

  // byFund with USD
  const fundMap = {};
  allRaw.forEach(r => {
    if (!fundMap[r.fund]) fundMap[r.fund] = { total: 0, count: 0 };
    fundMap[r.fund].total += toUSD(r.amount, r.currency);
    fundMap[r.fund].count++;
  });
  const byFund = Object.entries(fundMap).map(([fund,v]) => ({ fund, total: v.total, count: v.count })).sort((a,b) => b.total - a.total);

  // byType with USD
  const typeMap = {};
  allRaw.forEach(r => {
    if (!typeMap[r.expense_type]) typeMap[r.expense_type] = { total: 0, count: 0 };
    typeMap[r.expense_type].total += toUSD(r.amount, r.currency);
    typeMap[r.expense_type].count++;
  });
  const byType = Object.entries(typeMap).map(([expense_type,v]) => ({ expense_type, total: v.total, count: v.count }));

  // byCategory with USD
  const catMap = {};
  allRaw.forEach(r => {
    if (!catMap[r.category]) catMap[r.category] = { total: 0, count: 0 };
    catMap[r.category].total += toUSD(r.amount, r.currency);
    catMap[r.category].count++;
  });
  const byCategory = Object.entries(catMap).map(([category,v]) => ({ category, total: v.total, count: v.count })).sort((a,b) => b.total - a.total);

  const total = { total: totalUSD };
  const hasNonUSD = allRaw.some(r => r.currency && r.currency !== 'USD');
  const years = db.prepare(`SELECT DISTINCT strftime('%Y',date) as year FROM expenses ORDER BY year DESC`).all().map(r=>r.year);

  // Feature 6: Prior year comparison
  let priorYearTotal = null, priorYearByType = null;
  if (year) {
    const priorYear = String(parseInt(year) - 1);
    const priorYearFilter = `AND strftime('%Y',date) = '${priorYear}'`;
    const priorWhere = `WHERE 1=1 ${userFilter} ${priorYearFilter}`;
    const priorRaw = db.prepare(`SELECT amount, currency, expense_type FROM expenses ${priorWhere}`).all();
    priorYearTotal = priorRaw.reduce((s,r) => s + toUSD(r.amount, r.currency), 0);
    const priorTypeMap = {};
    priorRaw.forEach(r => {
      if (!priorTypeMap[r.expense_type]) priorTypeMap[r.expense_type] = 0;
      priorTypeMap[r.expense_type] += toUSD(r.amount, r.currency);
    });
    priorYearByType = Object.entries(priorTypeMap).map(([expense_type, total]) => ({ expense_type, total }));
  }

  // byPerson (admin only)
  let byPerson = [];
  if (user.role === 'admin') {
    const personMap = {};
    allRaw.forEach(r => {
      if (!personMap[r.user_name]) personMap[r.user_name] = { total: 0, count: 0 };
      personMap[r.user_name].total += toUSD(r.amount, r.currency);
      personMap[r.user_name].count++;
    });
    byPerson = Object.entries(personMap).map(([user_name,v]) => ({ user_name, total: v.total, count: v.count })).sort((a,b) => b.total - a.total);
  }

  res.json({ total: total.total, byFund, byType, byCategory, byPerson, years, priorYearTotal, priorYearByType, hasNonUSD });
});

// ── EXCEL EXPORT ──────────────────────────────────────────────────────────────
app.get('/api/export', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  const { year, report_id } = req.query;

  let sql = `SELECT e.*, u.name as user_name FROM expenses e JOIN users u ON e.user_id = u.id WHERE 1=1`;
  const params = [];
  if (user.role !== 'admin') { sql += ' AND e.user_id = ?'; params.push(user.id); }
  if (year) { sql += ` AND strftime('%Y',e.date) = ?`; params.push(year); }
  if (report_id) { sql += ' AND e.report_id = ?'; params.push(report_id); }
  sql += ' ORDER BY e.date DESC';

  const all = db.prepare(sql).all(...params);
  const wb = XLSX.utils.book_new();

  const fmt = rows => rows.map(e => ({
    'Employee':       e.user_name || '',
    'Date':           e.date,
    'Vendor':         e.vendor,
    'Amount':         e.amount,
    'Currency':       e.currency,
    'Fund':           e.fund,
    'Expense Type':   e.expense_type,
    'Category':       e.category,
    'Notes':          e.notes || '',
    'Receipt':        e.receipt_filename || '',
    'Payment Method': e.payment_method || ''
  }));

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(fmt(all)), 'All Expenses');

  for (const fund of FUNDS) {
    const rows = all.filter(e => e.fund === fund);
    if (!rows.length) continue;
    const ws = XLSX.utils.json_to_sheet(fmt(rows));
    XLSX.utils.sheet_add_json(ws, [{ 'Employee':'TOTAL', 'Amount': rows.reduce((s,r)=>s+r.amount,0) }], { skipHeader:true, origin:-1 });
    XLSX.utils.book_append_sheet(wb, ws, fund.replace(/[^a-zA-Z0-9 ]/g,'').slice(0,31));
  }

  const typeRows = EXPENSE_TYPES.map(t => {
    const rows = all.filter(e => e.expense_type === t);
    return { 'Expense Type': t, 'Count': rows.length, 'Total Amount': rows.reduce((s,r)=>s+r.amount,0) };
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(typeRows), 'By Type Summary');

  const receipts = all.filter(e => e.amount >= 75);
  if (receipts.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(fmt(receipts)), 'Receipts (≥$75)');

  const label = year ? `-${year}` : '';
  const filename = `PV-Expenses${label}-${new Date().toISOString().slice(0,10)}.xlsx`;
  const buf = XLSX.write(wb, { type:'buffer', bookType:'xlsx' });
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
});

// ── CSV IMPORT ────────────────────────────────────────────────────────────────
const csvUpload = multer({ storage: multer.memoryStorage() });

// Detect card format and parse rows
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const header = lines[0].toLowerCase().replace(/"/g, '');
  const cols = header.split(',').map(c => c.trim());

  // Detect card type by header shape
  let fmt = 'generic';
  if (cols.includes('transaction date') && cols.includes('description') && cols.includes('amount')) fmt = 'chase';
  if (cols.includes('date') && cols.includes('description') && cols.includes('amount') && cols.includes('extended details')) fmt = 'amex';
  if (cols.includes('posted date') && cols.includes('payee') && cols.includes('debit')) fmt = 'capital_one';
  if (cols.includes('transaction date') && cols.includes('merchant name')) fmt = 'citi';

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw.trim()) continue;
    // CSV-aware split (handle quoted commas)
    const vals = [];
    let inQ = false, cur = '';
    for (const ch of raw) {
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === ',' && !inQ) { vals.push(cur.trim()); cur = ''; }
      else cur += ch;
    }
    vals.push(cur.trim());

    const get = (k) => { const idx = cols.indexOf(k); return idx >= 0 ? (vals[idx]||'').trim() : ''; };

    let date = '', vendor = '', amount = 0, skip = false;

    if (fmt === 'chase') {
      date = get('transaction date');
      vendor = get('description');
      const raw_amt = get('amount');
      amount = Math.abs(parseFloat(raw_amt) || 0);
      if (parseFloat(raw_amt) > 0) skip = true; // credits/payments
    } else if (fmt === 'amex') {
      date = get('date');
      vendor = get('description');
      amount = Math.abs(parseFloat(get('amount')) || 0);
      if (parseFloat(get('amount')) < 0) skip = true; // credits
    } else if (fmt === 'capital_one') {
      date = get('posted date') || get('transaction date');
      vendor = get('payee');
      const debit = parseFloat(get('debit')) || 0;
      const credit = parseFloat(get('credit')) || 0;
      amount = debit;
      if (credit > 0) skip = true;
    } else if (fmt === 'citi') {
      date = get('date') || get('transaction date');
      vendor = get('merchant name') || get('description');
      const raw_amt = get('debit') || get('amount');
      amount = Math.abs(parseFloat(raw_amt) || 0);
    } else {
      // Generic: find date/vendor/amount by common names
      const dateCol = cols.find(c => c.includes('date'));
      const vendorCol = cols.find(c => c.includes('description') || c.includes('merchant') || c.includes('vendor') || c.includes('payee'));
      const amtCol = cols.find(c => c.includes('amount') || c.includes('debit') || c.includes('charge'));
      date = dateCol ? get(dateCol) : '';
      vendor = vendorCol ? get(vendorCol) : '';
      amount = Math.abs(parseFloat(amtCol ? get(amtCol) : '0') || 0);
    }

    if (skip || !vendor || amount === 0) continue;

    // Normalize date to YYYY-MM-DD
    let isoDate = '';
    try {
      const d = new Date(date);
      if (!isNaN(d)) isoDate = d.toISOString().slice(0, 10);
    } catch(e) {}

    // Guess category from vendor name
    const vl = vendor.toLowerCase();
    let cat = 'Other';
    if (/airline|delta|united|american air|southwest|jetblue|flight|lufthansa|british|virgin|spirit|frontier|hotel|marriott|hilton|hyatt|westin|sheraton|airbnb|uber|lyft|taxi|rental|avis|hertz|train|amtrak|transit|parking/.test(vl)) cat = 'Travel';
    else if (/restaurant|cafe|coffee|starbucks|mcdonald|chipotle|subway|doordash|grubhub|ubereats|dining|pizza|sushi|grill|kitchen|eatery|diner/.test(vl)) cat = 'Meals';
    else if (/law|legal|attorney|counsel|firm llp|firm llc/.test(vl)) cat = 'Legal';
    else if (/accounting|deloitte|pwc|kpmg|ey |ernst|audit/.test(vl)) cat = 'Accounting';
    else if (/office depot|staples|amazon|supply|fedex|ups|usps|shipping/.test(vl)) cat = 'Office';
    else if (/openai|anthropic|claude\.ai|chatgpt|cursor\.so|perplexity|midjourney|elevenlabs|cohere|mistral|hugging|replicate|together\.ai|groq|deepseek|github copilot|copilot|gemini|grok|runway|stability/.test(vl)) cat = 'AI';
    else if (/zoom|slack|notion|google|microsoft|adobe|dropbox|subscription|saas|software|aws|github/.test(vl)) cat = 'Subscription Services';
    else if (/health|medical|dental|vision|pharmacy|cvs|walgreen|doctor/.test(vl)) cat = 'Health Care';

    rows.push({ date: isoDate, vendor, amount, category: cat, category_hint: cat, raw_date: date });
  }
  return rows;
}

app.post('/api/import-csv', requireAuth, csvUpload.single('csv'), (req, res) => {
  try {
    const text = req.file.buffer.toString('utf8');
    const rows = parseCSV(text);
    res.json({ ok: true, rows, count: rows.length });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/import-csv/confirm', requireAuth, (req, res) => {
  const { rows, payment_method } = req.body;
  if (!Array.isArray(rows) || !rows.length) return res.status(400).json({ error: 'No rows' });
  const stmt = db.prepare(`INSERT INTO expenses (user_id,date,vendor,amount,currency,fund,expense_type,category,description,reimbursable,notes,ai_extracted,payment_method)
    VALUES (?,?,?,?,?,?,?,?,?,0,?,0,?)`);
  let saved = 0;
  const insertMany = db.transaction((rows) => {
    for (const r of rows) {
      if (!r.fund || !r.expense_type || !r.category) continue;
      stmt.run(req.session.userId, r.date, r.vendor, r.amount, r.currency||'USD', r.fund, r.expense_type, r.category, r.description||'', r.notes||'', payment_method||null);
      saved++;
    }
  });
  insertMany(rows);
  res.json({ ok: true, saved });
});

// ── DEDUP CHECK ───────────────────────────────────────────────────────────────
app.post('/api/expenses/check-dupes', requireAuth, (req, res) => {
  const { rows } = req.body;
  if (!Array.isArray(rows)) return res.json({ dupes: [] });
  const dupes = [];
  for (const r of rows) {
    const existing = db.prepare(
      `SELECT id, vendor, date, amount FROM expenses WHERE user_id=? AND date=? AND vendor=? AND ABS(amount-?)< 0.01`
    ).get(req.session.userId, r.date, r.vendor, r.amount);
    if (existing) dupes.push({ idx: r._idx, vendor: r.vendor, date: r.date, amount: r.amount });
  }
  res.json({ dupes });
});

// ── PASSWORD CHANGE ────────────────────────────────────────────────────────────
app.post('/api/auth/change-password', requireAuth, (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) return res.status(400).json({ error: 'Missing fields' });
  if (new_password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  if (user.password !== current_password) return res.status(401).json({ error: 'Current password is incorrect' });
  db.prepare('UPDATE users SET password=? WHERE id=?').run(new_password, user.id);
  res.json({ ok: true });
});

// ── USER PROFILE UPDATE (telegram_chat_id) ────────────────────────────────────
app.patch('/api/auth/profile', requireAuth, (req, res) => {
  const { telegram_chat_id, email } = req.body;
  const updates = [];
  const vals = [];
  if (telegram_chat_id !== undefined) { updates.push('telegram_chat_id=?'); vals.push(telegram_chat_id||null); }
  if (email !== undefined) { updates.push('email=?'); vals.push(email||null); }
  if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });
  vals.push(req.session.userId);
  db.prepare(`UPDATE users SET ${updates.join(',')} WHERE id=?`).run(...vals);
  res.json({ ok: true });
});

// ── ADMIN: update any user's profile ─────────────────────────────────────────
app.patch('/api/users/:id', requireAuth, requireAdmin, (req, res) => {
  const { telegram_chat_id, email, password } = req.body;
  const updates = [];
  const vals = [];
  if (telegram_chat_id !== undefined) { updates.push('telegram_chat_id=?'); vals.push(telegram_chat_id||null); }
  if (email !== undefined) { updates.push('email=?'); vals.push(email||null); }
  if (password) { updates.push('password=?'); vals.push(password); }
  if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });
  vals.push(req.params.id);
  db.prepare(`UPDATE users SET ${updates.join(',')} WHERE id=?`).run(...vals);
  res.json({ ok: true });
});

// ── BULK REVIEW (Feature 3) ───────────────────────────────────────────────────
app.post('/api/reports/bulk-review', requireAuth, requireAdmin, async (req, res) => {
  const { ids, action } = req.body;
  if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: 'No ids provided' });
  if (action !== 'approve') return res.status(400).json({ error: 'Only approve supported for bulk' });

  const results = [];
  for (const id of ids) {
    const report = db.prepare('SELECT r.*, u.name as user_name, u.telegram_chat_id as employee_tg FROM reports r JOIN users u ON r.user_id = u.id WHERE r.id = ?').get(id);
    if (!report || report.status !== 'submitted') { results.push({ id, ok: false, error: 'Not found or not submitted' }); continue; }
    db.prepare(`UPDATE reports SET status='approved', reviewed_at=datetime('now'), reviewer_id=?, reviewer_notes='' WHERE id=?`)
      .run(req.session.userId, id);
    if (report.employee_tg) {
      const msg = `✅ <b>Expense Report Approved</b>\n\n📋 <b>${report.title}</b>\n💰 $${(report.total||0).toFixed(2)}\n\nMike approved your report.`;
      await sendTelegram(report.employee_tg, msg);
    }
    results.push({ id, ok: true });
  }
  res.json({ ok: true, results });
});

// ── REPORT COMMENTS (Feature 5) ───────────────────────────────────────────────
app.get('/api/reports/:id/comments', requireAuth, (req, res) => {
  const comments = db.prepare(`
    SELECT c.*, u.name as user_name FROM report_comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.report_id = ? ORDER BY c.created_at ASC
  `).all(req.params.id);
  res.json(comments);
});

app.post('/api/reports/:id/comments', requireAuth, async (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) return res.status(400).json({ error: 'Message required' });
  const userId = req.session.userId;
  const report = db.prepare('SELECT r.*, u.name as owner_name, u.telegram_chat_id as owner_tg FROM reports r JOIN users u ON r.user_id = u.id WHERE r.id = ?').get(req.params.id);
  if (!report) return res.status(404).json({ error: 'Report not found' });

  db.prepare('INSERT INTO report_comments (report_id, user_id, message) VALUES (?,?,?)').run(req.params.id, userId, message.trim());
  const commenter = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

  // Notify the other party
  if (commenter.id === report.user_id) {
    // Employee commented — notify admin (Mike)
    const tgMsg = `💬 <b>New comment on report</b>\n\n👤 <b>${commenter.name}</b>\n📋 ${report.title}\n\n${message.trim()}`;
    await sendTelegram(MIKE_CHAT_ID, tgMsg);
  } else if (report.owner_tg) {
    // Admin commented — notify employee
    const tgMsg = `💬 <b>Mike commented on your report</b>\n\n📋 ${report.title}\n\n${message.trim()}`;
    await sendTelegram(report.owner_tg, tgMsg);
  }

  res.json({ ok: true });
});

// ── FUND BUDGETS (Feature 7) ───────────────────────────────────────────────────
app.get('/api/budgets', requireAuth, (req, res) => {
  const budgets = db.prepare('SELECT * FROM fund_budgets ORDER BY fund').all();
  res.json(budgets);
});

app.post('/api/budgets', requireAuth, requireAdmin, (req, res) => {
  const { fund, annual_budget, year } = req.body;
  if (!fund || !annual_budget || !year) return res.status(400).json({ error: 'fund, annual_budget, year required' });
  db.prepare('INSERT INTO fund_budgets (fund, annual_budget, year) VALUES (?,?,?) ON CONFLICT(fund,year) DO UPDATE SET annual_budget=excluded.annual_budget')
    .run(fund, parseFloat(annual_budget), parseInt(year));
  res.json({ ok: true });
});

// ── EXPENSE TEMPLATES (Feature 8) ─────────────────────────────────────────────
app.get('/api/templates', requireAuth, (req, res) => {
  const templates = db.prepare('SELECT * FROM expense_templates WHERE user_id = ? ORDER BY name').all(req.session.userId);
  res.json(templates);
});

app.post('/api/templates', requireAuth, (req, res) => {
  const { name, vendor, amount, currency, fund, expense_type, category, notes } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name required' });
  const result = db.prepare(`INSERT INTO expense_templates (user_id, name, vendor, amount, currency, fund, expense_type, category, notes)
    VALUES (?,?,?,?,?,?,?,?,?)`)
    .run(req.session.userId, name.trim(), vendor||null, amount?parseFloat(amount):null, currency||'USD', fund||null, expense_type||null, category||null, notes||null);
  res.json({ id: result.lastInsertRowid });
});

app.delete('/api/templates/:id', requireAuth, (req, res) => {
  const tmpl = db.prepare('SELECT * FROM expense_templates WHERE id = ?').get(req.params.id);
  if (!tmpl) return res.status(404).json({ error: 'Not found' });
  if (tmpl.user_id !== req.session.userId) return res.status(403).json({ error: 'Forbidden' });
  db.prepare('DELETE FROM expense_templates WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

app.post('/api/templates/:id/use', requireAuth, (req, res) => {
  const tmpl = db.prepare('SELECT * FROM expense_templates WHERE id = ?').get(req.params.id);
  if (!tmpl) return res.status(404).json({ error: 'Not found' });
  if (!tmpl.fund || !tmpl.expense_type || !tmpl.category)
    return res.status(400).json({ error: 'Template missing required fields' });
  const today = new Date().toISOString().slice(0, 10);
  const result = db.prepare(`INSERT INTO expenses (user_id, date, vendor, amount, currency, fund, expense_type, category, notes, reimbursable, ai_extracted)
    VALUES (?,?,?,?,?,?,?,?,?,0,0)`)
    .run(req.session.userId, today, tmpl.vendor||'', tmpl.amount||0, tmpl.currency||'USD', tmpl.fund, tmpl.expense_type, tmpl.category, tmpl.notes||'');
  res.json({ id: result.lastInsertRowid });
});

// ── GLOBAL SEARCH (Feature 1) ──────────────────────────────────────────────────
app.get('/api/search', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  const q = (req.query.q || '').trim();
  if (!q || q.length < 2) return res.json({ expenses: [], reports: [] });
  const like = `%${q}%`;

  let expSql = `SELECT e.id, e.date, e.vendor, e.amount, e.currency, e.fund, e.expense_type, e.category, e.notes, u.name as user_name
    FROM expenses e JOIN users u ON e.user_id = u.id
    WHERE (e.vendor LIKE ? OR e.notes LIKE ? OR e.category LIKE ? OR e.fund LIKE ?)`;
  const expParams = [like, like, like, like];
  if (user.role !== 'admin') { expSql += ' AND e.user_id = ?'; expParams.push(user.id); }
  expSql += ' ORDER BY e.date DESC LIMIT 50';

  let repSql = `SELECT r.id, r.title, r.status, r.total, r.submitted_at, u.name as user_name
    FROM reports r JOIN users u ON r.user_id = u.id
    WHERE (r.title LIKE ? OR u.name LIKE ?)`;
  const repParams = [like, like];
  if (user.role !== 'admin') { repSql += ' AND r.user_id = ?'; repParams.push(user.id); }
  repSql += ' ORDER BY r.created_at DESC LIMIT 50';

  res.json({
    expenses: db.prepare(expSql).all(...expParams),
    reports: db.prepare(repSql).all(...repParams)
  });
});

// ── PDF EXPORT (Feature 2) ─────────────────────────────────────────────────────
app.get('/api/reports/:id/pdf', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  const report = db.prepare('SELECT r.*, u.name as user_name FROM reports r JOIN users u ON r.user_id = u.id WHERE r.id = ?').get(req.params.id);
  if (!report) return res.status(404).json({ error: 'Not found' });
  if (user.role !== 'admin' && report.user_id !== user.id) return res.status(403).json({ error: 'Forbidden' });
  const expenses = db.prepare('SELECT * FROM expenses WHERE report_id = ? ORDER BY date ASC').all(req.params.id);

  const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
  const filename = `PV-Report-${report.id}-${new Date().toISOString().slice(0,10)}.pdf`;
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'application/pdf');
  doc.pipe(res);

  // Header
  doc.fontSize(18).font('Helvetica-Bold').text('PROMUS VENTURES — EXPENSE REPORT', { align: 'center' });
  doc.moveDown(0.3);
  doc.fontSize(13).font('Helvetica').text(report.title, { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(10).font('Helvetica').fillColor('#555555');
  doc.text(`Submitter: ${report.user_name}`);
  if (report.submitted_at) doc.text(`Submitted: ${report.submitted_at.slice(0,10)}`);
  if (report.date_from || report.date_to) doc.text(`Period: ${report.date_from || '—'} → ${report.date_to || '—'}`);
  doc.moveDown(0.5);
  doc.fillColor('#000000');
  doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke();
  doc.moveDown(0.5);

  // Table header
  const cols = [50, 115, 265, 330, 380, 440, 505];
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#333333');
  doc.text('Date', cols[0], doc.y, { width: 60, continued: true });
  doc.text('Vendor', cols[1], doc.y, { width: 145, continued: true });
  doc.text('Fund', cols[2], doc.y, { width: 60, continued: true });
  doc.text('Type', cols[3], doc.y, { width: 55, continued: true });
  doc.text('Category', cols[4], doc.y, { width: 55, continued: true });
  doc.text('Amount', cols[5], doc.y, { width: 60, align: 'right' });
  doc.moveDown(0.3);
  doc.moveTo(50, doc.y).lineTo(562, doc.y).strokeColor('#aaaaaa').stroke();
  doc.moveDown(0.3);

  // Expenses rows
  doc.font('Helvetica').fontSize(9).fillColor('#000000');
  const fundTotals = {};
  let grandTotal = 0;
  expenses.forEach((e, i) => {
    const y = doc.y;
    const bg = i % 2 === 0;
    if (bg) { doc.rect(50, y - 2, 512, 14).fillColor('#f7f7f7').fill(); doc.fillColor('#000000'); }
    const amt = `$${e.amount.toFixed(2)}`;
    doc.text(e.date, cols[0], y, { width: 60, continued: true });
    doc.text((e.vendor||'').slice(0,22), cols[1], y, { width: 145, continued: true });
    doc.text((e.fund||'').slice(0,12), cols[2], y, { width: 60, continued: true });
    const typeShort = e.expense_type === 'GP Expense' ? 'GP' : e.expense_type === 'LP Expense' ? 'LP' : 'Org';
    doc.text(typeShort, cols[3], y, { width: 55, continued: true });
    doc.text((e.category||'').slice(0,14), cols[4], y, { width: 55, continued: true });
    doc.text(amt, cols[5], y, { width: 60, align: 'right' });
    fundTotals[e.fund] = (fundTotals[e.fund] || 0) + e.amount;
    grandTotal += e.amount;
    if (doc.y > 700) { doc.addPage(); }
  });

  doc.moveDown(0.5);
  doc.moveTo(50, doc.y).lineTo(562, doc.y).strokeColor('#000000').stroke();
  doc.moveDown(0.5);

  // Subtotals by fund
  doc.font('Helvetica-Bold').fontSize(9).text('Subtotals by Fund:', { underline: true });
  doc.moveDown(0.3);
  Object.entries(fundTotals).forEach(([fund, total]) => {
    doc.font('Helvetica').text(`  ${fund}`, { continued: true, width: 300 });
    doc.text(`$${total.toFixed(2)}`, { align: 'right', width: 260 });
  });
  doc.moveDown(0.3);
  doc.font('Helvetica-Bold').fontSize(11);
  doc.text('TOTAL:', { continued: true, width: 300 });
  doc.text(`$${grandTotal.toFixed(2)}`, { align: 'right', width: 260 });

  // Footer
  doc.moveDown(2);
  doc.fontSize(8).font('Helvetica').fillColor('#888888').text('Confidential — Promus Ventures', { align: 'center' });

  doc.end();
});

// ── EXPENSE SPLITS (Feature 5) ─────────────────────────────────────────────────
app.get('/api/expenses/:id/splits', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id);
  if (!expense) return res.status(404).json({ error: 'Not found' });
  if (user.role !== 'admin' && expense.user_id !== user.id) return res.status(403).json({ error: 'Forbidden' });
  const splits = db.prepare('SELECT * FROM expense_splits WHERE expense_id = ?').all(req.params.id);
  res.json(splits);
});

app.post('/api/expenses/:id/splits', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id);
  if (!expense) return res.status(404).json({ error: 'Not found' });
  if (user.role !== 'admin' && expense.user_id !== user.id) return res.status(403).json({ error: 'Forbidden' });

  const { splits } = req.body;
  if (!Array.isArray(splits) || !splits.length) {
    // Clear splits (toggle off)
    db.prepare('DELETE FROM expense_splits WHERE expense_id = ?').run(req.params.id);
    return res.json({ ok: true });
  }

  const splitTotal = splits.reduce((s, sp) => s + (parseFloat(sp.amount) || 0), 0);
  if (Math.abs(splitTotal - expense.amount) > 0.01) {
    return res.status(400).json({ error: `Split total $${splitTotal.toFixed(2)} does not match expense amount $${expense.amount.toFixed(2)}` });
  }

  db.prepare('DELETE FROM expense_splits WHERE expense_id = ?').run(req.params.id);
  const stmt = db.prepare('INSERT INTO expense_splits (expense_id, fund, expense_type, amount, pct) VALUES (?,?,?,?,?)');
  const insertAll = db.transaction((splits) => {
    for (const sp of splits) {
      stmt.run(req.params.id, sp.fund, sp.expense_type, parseFloat(sp.amount), sp.pct ? parseFloat(sp.pct) : null);
    }
  });
  insertAll(splits);
  res.json({ ok: true });
});

// ── MONTHLY DIGEST (Feature 6) ────────────────────────────────────────────────
app.post('/api/digest/send', requireAuth, requireAdmin, async (req, res) => {
  const now = new Date();
  const monthName = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const monthStart = `${y}-${m}-01`;
  const monthEnd = `${y}-${m}-31`;

  // Current month spend by fund
  const fundRows = db.prepare(`SELECT fund, SUM(amount) as total FROM expenses WHERE date >= ? AND date <= ? GROUP BY fund ORDER BY total DESC`).all(monthStart, monthEnd);
  const monthTotal = fundRows.reduce((s,r) => s + r.total, 0);

  // Pending reports
  const pending = db.prepare(`SELECT r.*, u.name as user_name FROM reports r JOIN users u ON r.user_id = u.id WHERE r.status = 'submitted' ORDER BY r.submitted_at ASC`).all();

  // Missing receipts (amount >= 75, no receipt)
  const missingReceipts = db.prepare(`SELECT e.*, u.name as user_name FROM expenses e JOIN users u ON e.user_id = u.id WHERE e.amount >= 75 AND (e.receipt_filename IS NULL OR e.receipt_filename = '') ORDER BY e.amount DESC LIMIT 20`).all();

  const fundLines = fundRows.length
    ? fundRows.map(r => `• ${r.fund}: $${r.total.toLocaleString('en-US', {minimumFractionDigits:2,maximumFractionDigits:2})}`).join('\n')
    : '• No expenses this month';

  const pendingLines = pending.length
    ? pending.map(r => {
        const days = r.submitted_at ? Math.floor((Date.now() - new Date(r.submitted_at + (r.submitted_at.includes('Z')?'':'Z')).getTime()) / 86400000) : 0;
        return `• ${r.user_name} — ${r.title} ($${(r.total||0).toFixed(2)}) — ${days} day${days!==1?'s':''} waiting`;
      }).join('\n')
    : '• None';

  const receiptLines = missingReceipts.length
    ? missingReceipts.slice(0,10).map(e => `• ${e.vendor} $${e.amount.toFixed(2)} — ${e.user_name}`).join('\n')
    : '• None';

  const msg = `📊 PV Expenses — ${monthName} Digest\n\n💰 Total Spend: $${monthTotal.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}\n\nBy Fund:\n${fundLines}\n\n⏳ Pending Approval (${pending.length} report${pending.length!==1?'s':''}):\n${pendingLines}\n\n⚠️ Missing Receipts (${missingReceipts.length}):\n${receiptLines}`;

  const ok = await sendTelegram(MIKE_CHAT_ID, msg);
  res.json({ ok, message: msg });
});

// ── POLICY VIOLATIONS ────────────────────────────────────────────────────────
app.get('/api/violations', requireAuth, requireAdmin, (req, res) => {
  const now = Date.now();
  const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;

  // Missing receipts on expenses ≥$75 (not in Mileage/Per Diem)
  const missingReceipts = db.prepare(`
    SELECT e.*, u.name as user_name FROM expenses e
    JOIN users u ON e.user_id = u.id
    WHERE e.amount >= 75 AND (e.receipt_filename IS NULL OR e.receipt_filename = '')
    AND e.category NOT IN ('Mileage','Per Diem')
    ORDER BY e.date DESC
  `).all();

  // Expenses older than 90 days with no report assigned
  const staleExpenses = db.prepare(`
    SELECT e.*, u.name as user_name FROM expenses e
    JOIN users u ON e.user_id = u.id
    WHERE e.report_id IS NULL AND e.date < date('now','-90 days')
    ORDER BY e.date ASC
  `).all();

  res.json({ missingReceipts, staleExpenses });
});

// ── ACCOUNTANT EXPORT ─────────────────────────────────────────────────────────
app.get('/api/export/accountant', requireAuth, requireAdmin, (req, res) => {
  const year = req.query.year || new Date().getFullYear();

  const expenses = db.prepare(`
    SELECT e.*, u.name as user_name FROM expenses e
    JOIN users u ON e.user_id = u.id
    WHERE strftime('%Y', e.date) = ? ORDER BY e.fund, e.category, e.date
  `).all(String(year));

  const wb = XLSX.utils.book_new();

  // Sheet 1 — Summary by Fund & Category
  const fundCatMap = {};
  for (const e of expenses) {
    const k = e.fund || 'Unknown';
    if (!fundCatMap[k]) fundCatMap[k] = {};
    fundCatMap[k][e.category] = (fundCatMap[k][e.category] || 0) + e.amount;
  }
  const summaryRows = [['Fund','Category','Total']];
  let grandTotal = 0;
  for (const fund of Object.keys(fundCatMap).sort()) {
    for (const cat of Object.keys(fundCatMap[fund]).sort()) {
      summaryRows.push([fund, cat, +fundCatMap[fund][cat].toFixed(2)]);
      grandTotal += fundCatMap[fund][cat];
    }
  }
  summaryRows.push(['','GRAND TOTAL', +grandTotal.toFixed(2)]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), `${year} Summary`);

  // Sheet 2 — All Expenses Detail
  const detailRows = [['Date','Vendor','Fund','Type','Category','Amount','Currency','Receipt','Submitted By','Notes']];
  for (const e of expenses) {
    detailRows.push([e.date, e.vendor, e.fund, e.expense_type, e.category,
      +e.amount.toFixed(2), e.currency||'USD',
      e.receipt_filename ? 'Yes' : 'No',
      e.user_name, e.notes||'']);
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(detailRows), `${year} Detail`);

  // Sheet 3 — By Expense Type
  const typeMap = {};
  for (const e of expenses) {
    typeMap[e.expense_type] = (typeMap[e.expense_type] || 0) + e.amount;
  }
  const typeRows = [['Expense Type','Total']];
  for (const [t, v] of Object.entries(typeMap).sort()) typeRows.push([t, +v.toFixed(2)]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(typeRows), `${year} By Type`);

  // Sheet 4 — Missing Receipts (policy violations)
  const missingRows = [['Date','Vendor','Amount','Fund','Category','Submitted By']];
  const missing = db.prepare(`
    SELECT e.*, u.name as user_name FROM expenses e JOIN users u ON e.user_id = u.id
    WHERE strftime('%Y', e.date) = ? AND e.amount >= 75
    AND (e.receipt_filename IS NULL OR e.receipt_filename = '')
    AND e.category NOT IN ('Mileage','Per Diem')
  `).all(String(year));
  for (const e of missing) missingRows.push([e.date, e.vendor, +e.amount.toFixed(2), e.fund, e.category, e.user_name]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(missingRows), 'Missing Receipts');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.set({
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': `attachment; filename="PV-Expenses-${year}-Accountant.xlsx"`
  });
  res.send(buf);
});

// ── APPROVAL REMINDER (runs hourly, alerts Mike if reports pending > 48h) ─────
async function checkApprovalReminders() {
  try {
    const stale = db.prepare(`
      SELECT r.*, u.name as user_name FROM reports r
      JOIN users u ON r.user_id = u.id
      WHERE r.status = 'submitted'
      AND r.submitted_at < datetime('now', '-48 hours')
    `).all();
    if (stale.length > 0) {
      const lines = stale.map(r => {
        const hrs = Math.round((Date.now() - new Date(r.submitted_at).getTime()) / 3600000);
        return `• ${r.user_name}: "${r.title}" — ${hrs}h pending`;
      }).join('\n');
      await sendTelegram(MIKE_CHAT_ID,
        `⏰ <b>Approval Reminder</b>\n\n${stale.length} report${stale.length!==1?'s':''} waiting over 48 hours:\n\n${lines}\n\n👉 Review at https://mcs-mac-mini-1.tail145633.ts.net`
      );
    }
  } catch(e) { console.error('Approval reminder error:', e.message); }
}
// Check every 4 hours
setInterval(checkApprovalReminders, 4 * 60 * 60 * 1000);

// ── STEPHANE AUTO-ACTIVATE (May 1) ───────────────────────────────────────────
function checkStephaneActivation() {
  const now = new Date();
  // Activate on May 1 or later if still inactive
  if (now.getMonth() === 4 && now.getDate() >= 1) { // month is 0-indexed
    const stephane = db.prepare(`SELECT * FROM users WHERE name LIKE 'Stéphane%'`).get();
    if (stephane && !stephane.active) {
      db.prepare(`UPDATE users SET active = 1 WHERE name LIKE 'Stéphane%'`).run();
      sendTelegram(MIKE_CHAT_ID, `✅ Stéphane Blanc has been automatically activated in PV Expenses. He can now log in at https://mcs-mac-mini-1.tail145633.ts.net`);
      console.log('Stéphane Blanc activated automatically (May 1)');
    }
  }
}
// Check daily at startup and every 24h
checkStephaneActivation();
setInterval(checkStephaneActivation, 24 * 60 * 60 * 1000);

// ── YEAR-END SUMMARY (Dec 31) ─────────────────────────────────────────────────
async function checkYearEndSummary() {
  const now = new Date();
  if (now.getMonth() !== 11 || now.getDate() !== 31) return; // Dec 31 only
  const year = now.getFullYear();

  const expenses = db.prepare(`SELECT e.*, u.name as user_name FROM expenses e JOIN users u ON e.user_id = u.id WHERE strftime('%Y', e.date) = ?`).all(String(year));
  if (!expenses.length) return;

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  // By fund
  const byFund = {};
  for (const e of expenses) byFund[e.fund] = (byFund[e.fund] || 0) + e.amount;
  const fundLines = Object.entries(byFund).sort((a,b)=>b[1]-a[1])
    .map(([f,v]) => `  ${f}: $${v.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`).join('\n');

  // By person
  const byPerson = {};
  for (const e of expenses) byPerson[e.user_name] = (byPerson[e.user_name] || 0) + e.amount;
  const personLines = Object.entries(byPerson).sort((a,b)=>b[1]-a[1])
    .map(([n,v]) => `  ${n}: $${v.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`).join('\n');

  // By category
  const byCat = {};
  for (const e of expenses) byCat[e.category] = (byCat[e.category] || 0) + e.amount;
  const catLines = Object.entries(byCat).sort((a,b)=>b[1]-a[1])
    .map(([c,v]) => `  ${c}: $${v.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`).join('\n');

  // Missing receipts
  const missingCount = expenses.filter(e => e.amount >= 75 && !e.receipt_filename && !['Mileage','Per Diem'].includes(e.category)).length;

  const msg = `🎆 <b>PV Expenses — ${year} Year-End Summary</b>\n\n💰 Total Spend: $${total.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}\n📊 ${expenses.length} expenses across ${Object.keys(byFund).length} funds\n\n<b>By Fund:</b>\n${fundLines}\n\n<b>By Person:</b>\n${personLines}\n\n<b>By Category:</b>\n${catLines}\n\n${missingCount > 0 ? `⚠️ ${missingCount} expense${missingCount!==1?'s':''} missing receipts — fix before sending to CPA.\n\n` : '✅ All receipts accounted for.\n\n'}📋 Run Accountant Export at https://mcs-mac-mini-1.tail145633.ts.net for the full CPA package.`;

  await sendTelegram(MIKE_CHAT_ID, msg);
  console.log(`Year-end summary sent for ${year}`);
}
// Check daily at midnight
setInterval(checkYearEndSummary, 24 * 60 * 60 * 1000);

// ── START ──────────────────────────────────────────────────────────────────────
app.listen(PORT, '127.0.0.1', () => {
  console.log(`💼  PV Expenses`);
  console.log(`🌐  http://localhost:${PORT}`);
});
