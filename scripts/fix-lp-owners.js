const Database = require('/Users/mini/.openclaw/workspace/mission-control/node_modules/better-sqlite3');
const db = new Database('/Users/mini/.openclaw/workspace/mission-control/data/mission.db');

// Known owner ID → name mapping from Affinity
const OWNER_MAP = {
  '42908347': 'Pierre Festal',
  '39216132': 'Gareth Keane',
  '136746016': 'Estelle Godard',
  '70986123': 'Jeremy Teboul',
};

// Add owner_name column if missing
try { db.exec('ALTER TABLE pv5_lps ADD COLUMN owner_name TEXT DEFAULT ""'); } catch(e) {}

// Update owner_name for all known owners
let updated = 0;
for (const [id, name] of Object.entries(OWNER_MAP)) {
  const result = db.prepare("UPDATE pv5_lps SET owner_name = ? WHERE owner = ?").run(name, id);
  console.log(`${name} (${id}): updated ${result.changes} LPs`);
  updated += result.changes;
}
console.log(`Total: ${updated} LPs updated with owner names`);
