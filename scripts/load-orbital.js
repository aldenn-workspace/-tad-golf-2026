const Database = require('/Users/mini/.openclaw/workspace/mission-control/node_modules/better-sqlite3');
const db = new Database('/Users/mini/.openclaw/workspace/mission-control/data/mission.db');

// Add Orbital fund
db.prepare('DELETE FROM portfolio_funds WHERE fund_id = ?').run('OVI');
db.prepare(`INSERT INTO portfolio_funds 
  (fund_id, name, type, fmv, cost, unrealized_gain, partners_capital, contributed_capital, distributed_capital, as_of, audited, notes)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
  .run('OVI', 'Orbital Ventures I SCA SICAV-RAIF', 'fund',
    132194626, 83860680, 48333946,
    0, 83860680, 0,
    '2025-12-31', 0,
    'Luxembourg SICAV-RAIF. EUR amounts converted at ~1.05 USD/EUR. Net TVPI ~1.6x.');

// Add Orbital holdings
db.prepare('DELETE FROM portfolio_holdings WHERE fund_id = ?').run('OVI');
const insert = db.prepare(`INSERT INTO portfolio_holdings
  (fund_id, company, date, round, shares, cost_per_share, fmv_per_share, cost, fair_value, unrealized_gain, change_in_fv, comments, as_of)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '2025-12-31')`);

const holdings = [
  ['The Exploration Company', '11/2021', 'Series Seed/A1/A2/B', 0, 0, 0, 12998001, 0, 0, 0, '0.091 ownership'],
  ['Mytra', '07/2023', 'Series A/B/C', 0, 0, 0, 6763768, 0, 0, 0, '0.027 ownership'],
  ['Fernride', '06/2021', 'Series A/A2/A3', 0, 0, 0, 6577182, 0, 0, 0, '0.073 ownership'],
  ['Jua', '06/2022', 'Series Pre-Seed/Seed/A', 0, 0, 0, 5009121, 0, 0, 0, '0.153 ownership'],
  ['Recycleye', '06/2021', 'Series Seed/A', 0, 0, 0, 5174896, 0, 0, 0, '0.140 ownership'],
  ['Encube', '11/2023', 'Series Seed/A', 0, 0, 0, 4901487, 0, 0, 0, '0.124 ownership'],
  ['RobCo', '11/2022', 'Series A/B/C', 0, 0, 0, 4965265, 0, 0, 0, '0.057 ownership'],
  ['SeerAI', '09/2020', 'Series Seed/Seed-2', 0, 0, 0, 4683385, 0, 0, 0, '0.311 ownership'],
  ['Mangata Networks', '12/2021', 'Series A', 0, 0, 0, 4362991, 0, 0, 0, ''],
  ['ALL.SPACE', '07/2020', 'Series B2/B1/C', 0, 0, 0, 4830252, 0, 0, 0, '0.032 ownership'],
  ['Wakeo', '05/2021', 'Series Seed/A/B', 0, 0, 0, 4474117, 0, 0, 0, '0.128 ownership'],
  ['Lunar Outpost', '04/2022', 'Series Seed/A', 0, 0, 0, 4166714, 0, 0, 0, '0.073 ownership — board seat (Orbital/Promus)'],
  ['Capra Robotics', '12/2024', 'Series Seed', 0, 0, 0, 2500037, 0, 0, 0, '0.101 ownership'],
  ['SAMP', '08/2024', 'Series A', 0, 0, 0, 3299972, 0, 0, 0, '0.150 ownership'],
  ['SatSure', '06/2023', 'Series A', 0, 0, 0, 2936814, 0, 0, 0, '0.052 ownership'],
  ['Ellipsis Drive', '02/2021', 'Series Seed', 0, 0, 0, 2122628, 0, 0, 0, '0.257 ownership'],
  ['Uplift360 Europe', '09/2024', 'Series Seed', 0, 0, 0, 1499909, 0, 0, 0, '0.139 ownership'],
  ['Akasha Imaging (Vicarious)', '10/2020', 'Common/Series C', 0, 0, 0, 1690616, 0, 0, 0, 'Exited'],
  ['Lunasonde', '03/2022', 'Series Seed', 0, 0, 0, 903341, 0, 0, 0, '0.036 ownership'],
  ['Vayu Robotics', '02/2022', 'Series Seed', 0, 0, 0, 184, 0, 0, 0, '0.005 ownership'],
];

holdings.forEach(h => insert.run('OVI', h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], h[8], h[9], h[10]));

console.log('Orbital loaded:', holdings.length, 'holdings');
console.log('Total cost: €83.9M | Total FMV: €132.2M | Unrealized: €48.3M');

// Verify total
const funds = db.prepare('SELECT fund_id, fmv, cost FROM portfolio_funds ORDER BY fmv DESC').all();
const total = funds.reduce((s,f) => ({fmv: s.fmv+f.fmv, cost: s.cost+f.cost}), {fmv:0,cost:0});
console.log('\nAll funds:');
funds.forEach(f => console.log(` ${f.fund_id}: FMV $${(f.fmv/1e6).toFixed(1)}M`));
console.log(`\nGrand Total FMV: $${(total.fmv/1e6).toFixed(1)}M`);
