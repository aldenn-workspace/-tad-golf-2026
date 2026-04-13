const Database = require('/Users/mini/.openclaw/workspace/mission-control/node_modules/better-sqlite3');
const db = new Database('/Users/mini/.openclaw/workspace/mission-control/data/mission.db');

// Add ownership column
try { db.exec("ALTER TABLE portfolio_holdings ADD COLUMN ownership REAL DEFAULT NULL"); } catch(e) {}

// Parse ownership from comments (format: "0.xxx ownership") and set directly
// Also handle Orbital holdings that have ownership in comments column
const rows = db.prepare("SELECT id, fund_id, company, comments FROM portfolio_holdings").all();

const update = db.prepare("UPDATE portfolio_holdings SET ownership=?, comments=? WHERE id=?");

let updated = 0;
rows.forEach(r => {
  // Match "0.xxx ownership" pattern in comments
  const match = r.comments && r.comments.match(/\b(0\.\d+)\s+ownership/i);
  if (match) {
    const pct = parseFloat(match[1]) * 100;
    // Remove ownership part from comments
    const cleanComment = r.comments.replace(/0\.\d+\s+ownership[;\s,]*/i, '').trim();
    update.run(pct, cleanComment, r.id);
    console.log(`✓ ${r.fund_id} | ${r.company}: ${pct.toFixed(1)}%`);
    updated++;
  }
});

// Also set Orbital ownership from the spreadsheet data (ownership = fd column)
const orbitalOwnership = {
  'The Exploration Company': 9.1,
  'Mytra': 2.7,
  'Fernride': 7.3,
  'Jua': 15.3,
  'Recycleye': 14.0,
  'Encube': 12.4,
  'RobCo': 5.7,
  'SeerAI': 31.1,
  'ALL.SPACE': 3.2,
  'Wakeo': 12.8,
  'Lunar Outpost': 7.3,
  'Capra Robotics': 10.1,
  'SAMP': 15.0,
  'SatSure': 5.2,
  'Ellipsis Drive': 25.7,
  'Uplift360 Europe': 13.9,
  'Akasha Imaging (Vicarious)': 1.1,
  'Lunasonde': 3.6,
  'Vayu Robotics': 0.5,
  'Mangata Networks': null,
};

const updateOV = db.prepare("UPDATE portfolio_holdings SET ownership=? WHERE fund_id='OVI' AND company LIKE ?");
Object.entries(orbitalOwnership).forEach(([name, pct]) => {
  if (pct !== null) {
    const r = updateOV.run(pct, '%' + name.split(' ')[0] + '%');
    if (r.changes) { console.log(`✓ OVI | ${name}: ${pct}%`); updated++; }
  }
});

console.log(`\nTotal updated: ${updated}`);
