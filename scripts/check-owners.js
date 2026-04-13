const Database = require('/Users/mini/.openclaw/workspace/mission-control/node_modules/better-sqlite3');
const db = new Database('/Users/mini/.openclaw/workspace/mission-control/data/mission.db');
const owners = db.prepare("SELECT DISTINCT owner FROM pv5_lps WHERE owner != ''").all();
console.log('All owner IDs:', owners.map(o=>o.owner).join(', '));
