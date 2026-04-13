const Database = require('/Users/mini/.openclaw/workspace/mission-control/node_modules/better-sqlite3');
const db = new Database('/Users/mini/.openclaw/workspace/mission-control/data/mission.db');
const withNews = db.prepare("SELECT name, hayley_updated, hayley_summary FROM companies WHERE hayley_summary IS NOT NULL AND hayley_summary != '' LIMIT 10").all();
console.log('Companies with Hayley news:', withNews.length);
withNews.forEach(c => console.log(' -', c.name, '|', c.hayley_updated, '|', (c.hayley_summary||'').slice(0,80)));
const total = db.prepare('SELECT COUNT(*) as n FROM companies').get();
console.log('Total companies:', total.n);
