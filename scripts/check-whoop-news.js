const Database = require('/Users/mini/.openclaw/workspace/mission-control/node_modules/better-sqlite3');
const db = new Database('/Users/mini/.openclaw/workspace/mission-control/data/mission.db');
const co = db.prepare("SELECT name, hayley_summary, hayley_updated FROM companies WHERE name LIKE '%WHOOP%'").get();
console.log('Name:', co.name);
console.log('Updated:', co.hayley_updated);
console.log('Summary:', JSON.stringify(co.hayley_summary));
