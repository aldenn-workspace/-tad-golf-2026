const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'data', 'expenses.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'employee',
    password TEXT NOT NULL,
    active INTEGER DEFAULT 1,
    telegram_chat_id TEXT,
    email TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    report_id INTEGER,
    date TEXT NOT NULL,
    vendor TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'USD',
    fund TEXT NOT NULL,
    expense_type TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    receipt_path TEXT,
    receipt_filename TEXT,
    ai_extracted INTEGER DEFAULT 0,
    ai_line_items TEXT,
    reimbursable INTEGER DEFAULT 0,
    notes TEXT,
    payment_method TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    date_from TEXT NOT NULL,
    date_to TEXT NOT NULL,
    status TEXT DEFAULT 'draft',
    total REAL DEFAULT 0,
    submitted_at TEXT,
    reviewed_at TEXT,
    reviewer_id INTEGER,
    reviewer_notes TEXT,
    rejection_reason TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// New tables for features
db.exec(`
  CREATE TABLE IF NOT EXISTS report_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (report_id) REFERENCES reports(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS fund_budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fund TEXT NOT NULL,
    annual_budget REAL NOT NULL,
    year INTEGER NOT NULL,
    UNIQUE(fund, year)
  );

  CREATE TABLE IF NOT EXISTS expense_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    vendor TEXT,
    amount REAL,
    currency TEXT DEFAULT 'USD',
    fund TEXT,
    expense_type TEXT,
    category TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// Feature 5: expense splits
db.exec(`
  CREATE TABLE IF NOT EXISTS expense_splits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    expense_id INTEGER NOT NULL,
    fund TEXT NOT NULL,
    expense_type TEXT NOT NULL,
    amount REAL NOT NULL,
    pct REAL
  );
`);

// Seed users if table is empty
const userCount = db.prepare('SELECT COUNT(*) as n FROM users').get();
if (userCount.n === 0) {
  const insert = db.prepare(`INSERT INTO users (name, role, password, active) VALUES (?, ?, ?, ?)`);
  insert.run('Mike Collett',    'admin',            'PromusVC2026!',   1);
  insert.run('John Lusk',       'partner',          'JohnPV2026!',     1);
  insert.run('Matt Martorello', 'venture_partner',  'MattPV2026!',     1);
  insert.run('Bill Merchantz',  'venture_partner',  'BillPV2026!',     1);
  insert.run('Stéphane Blanc',  'partner',          'StéphanePV2026!', 0); // inactive until May 1
  console.log('✅ Users seeded');
}

module.exports = db;
