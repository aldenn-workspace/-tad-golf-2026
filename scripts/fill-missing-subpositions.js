const Database = require('/Users/mini/.openclaw/workspace/mission-control/node_modules/better-sqlite3');
const db = new Database('/Users/mini/.openclaw/workspace/mission-control/data/mission.db');

const holdings = db.prepare('SELECT * FROM portfolio_holdings').all();
const subs = db.prepare('SELECT fund_id, company FROM portfolio_subpositions').all();
const subMap = new Set(subs.map(s => s.fund_id + '||' + s.company));

const ins = db.prepare(`INSERT INTO portfolio_subpositions
  (fund_id, company, date, round, shares, cost_per_share, fmv_per_share, cost, fair_value, unrealized_gain, change_in_fv, comments)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

// Orbital holdings — use data from Excel SOI
const orbitalRounds = {
  'The Exploration Company': [
    ['2021-11-01', 'Series Seed', 0, 0, 0, 4166667, 4166667, 0, 0, 'Initial investment'],
    ['2022-06-01', 'Series A1', 0, 0, 0, 3000000, 3000000, 0, 0, ''],
    ['2023-03-01', 'Series A2', 0, 0, 0, 3000000, 3000000, 0, 0, ''],
    ['2024-01-01', 'Series B', 0, 0, 0, 2831334, 31321751, 28490417, 0, 'Marked to Series B'],
  ],
  'Mytra': [
    ['2023-07-01', 'Series A', 0, 0, 0, 2486608, 2486608, 0, 0, ''],
    ['2024-06-01', 'Series B', 0, 0, 0, 2000000, 2000000, 0, 0, ''],
    ['2025-01-01', 'Series C', 0, 0, 0, 2277160, 8499079, 6221919, 0, ''],
  ],
  'Fernride': [
    ['2021-06-01', 'Series A', 0, 0, 0, 3500000, 3500000, 0, 0, ''],
    ['2022-09-01', 'Series A2', 0, 0, 0, 1500000, 1500000, 0, 0, ''],
    ['2023-12-01', 'Series A3', 0, 0, 0, 1577182, 675000, -902182, 0, 'Marked down'],
  ],
  'Jua': [
    ['2022-06-01', 'Series Pre-Seed', 0, 0, 0, 1000000, 1000000, 0, 0, ''],
    ['2023-01-01', 'Series Seed', 0, 0, 0, 1335690, 1335690, 0, 0, ''],
    ['2024-06-01', 'Series A', 0, 0, 0, 2673431, 4894538, 2221107, 0, ''],
  ],
  'RobCo': [
    ['2022-11-01', 'Series A', 0, 0, 0, 1965265, 1965265, 0, 0, ''],
    ['2023-09-01', 'Series B', 0, 0, 0, 1500000, 1500000, 0, 0, ''],
    ['2024-12-01', 'Series C', 0, 0, 0, 1500000, 14382467, 12882467, 4534050, 'Marked to Series C'],
  ],
};

let added = 0;

holdings.forEach(h => {
  const key = h.fund_id + '||' + h.company;
  if (subMap.has(key)) return; // already has subpositions

  // For Orbital companies with multiple known rounds
  if (h.fund_id === 'OVI' && orbitalRounds[h.company]) {
    orbitalRounds[h.company].forEach(r => {
      ins.run(h.fund_id, h.company, r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7], r[8], r[9]);
    });
    console.log(`✓ OVI ${h.company}: ${orbitalRounds[h.company].length} rounds`);
    added++;
    return;
  }

  // For all others: mirror the holding as a single subposition row
  ins.run(
    h.fund_id, h.company,
    h.date, h.round,
    h.shares, h.cost_per_share, h.fmv_per_share,
    h.cost, h.fair_value, h.unrealized_gain, h.change_in_fv,
    h.comments
  );
  console.log(`✓ ${h.fund_id} | ${h.company}: mirrored single round`);
  added++;
});

// Fix PVIII Chef — already has subs but the holding record was a rollup; verify
console.log('\nAdded subpositions for', added, 'holdings');
console.log('Total subpositions:', db.prepare('SELECT COUNT(*) as n FROM portfolio_subpositions').get().n);
