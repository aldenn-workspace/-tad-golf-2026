const Database = require('/Users/mini/.openclaw/workspace/mission-control/node_modules/better-sqlite3');
const db = new Database('/Users/mini/.openclaw/workspace/mission-control/data/mission.db');
const fs = require('fs');

// Check companies with any portfolio data
const cos = db.prepare("SELECT name, portfolio_status, fair_value, pv_funds FROM companies WHERE portfolio_status IS NOT NULL AND portfolio_status != '' LIMIT 20").all();
console.log('Companies with portfolio_status:', cos.length);
cos.slice(0,10).forEach(c => console.log(' -', c.name, '|', c.portfolio_status, '| FMV:', c.fair_value, '| Funds:', c.pv_funds));

// Check Finn knowledge base files
const finnFiles = [
  '/Users/mini/finn/workspace/knowledge/promus-portfolio.md',
  '/Users/mini/finn/workspace/knowledge/portfolio-overview.md',
  '/Users/mini/finn/workspace/knowledge/promus-v-fundraise.md',
];
finnFiles.forEach(f => {
  const exists = fs.existsSync(f);
  console.log('\nFinn file:', f.split('/').pop(), exists ? '✅' : '❌');
  if (exists) console.log(fs.readFileSync(f,'utf8').slice(0,300));
});
