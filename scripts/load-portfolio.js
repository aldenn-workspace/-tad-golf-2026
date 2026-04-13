const Database = require('/Users/mini/.openclaw/workspace/mission-control/node_modules/better-sqlite3');
const db = new Database('/Users/mini/.openclaw/workspace/mission-control/data/mission.db');

// Create portfolio tables
db.exec(`
  CREATE TABLE IF NOT EXISTS portfolio_funds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fund_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'fund',
    fmv REAL DEFAULT 0,
    cost REAL DEFAULT 0,
    unrealized_gain REAL DEFAULT 0,
    partners_capital REAL DEFAULT 0,
    contributed_capital REAL DEFAULT 0,
    distributed_capital REAL DEFAULT 0,
    net_tvpi REAL DEFAULT 0,
    as_of TEXT DEFAULT '2025-12-31',
    audited INTEGER DEFAULT 0,
    notes TEXT DEFAULT '',
    updated TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS portfolio_holdings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fund_id TEXT NOT NULL,
    company TEXT NOT NULL,
    date TEXT,
    round TEXT,
    shares REAL DEFAULT 0,
    cost_per_share REAL DEFAULT 0,
    fmv_per_share REAL DEFAULT 0,
    cost REAL DEFAULT 0,
    fair_value REAL DEFAULT 0,
    unrealized_gain REAL DEFAULT 0,
    change_in_fv REAL DEFAULT 0,
    comments TEXT DEFAULT '',
    as_of TEXT DEFAULT '2025-12-31'
  );
`);

// Clear and reload
db.prepare('DELETE FROM portfolio_funds').run();
db.prepare('DELETE FROM portfolio_holdings').run();

// ── FUND DATA (from audited financials Dec 31 2025) ──────────────────────
const funds = [
  { fund_id: 'PVI', name: 'Promus Ventures I, L.P.', type: 'fund',
    fmv: 148199705, cost: 7895879, unrealized_gain: 140303826,
    partners_capital: 150540202, contributed_capital: 33500000, distributed_capital: 20403204,
    as_of: '2025-12-31', audited: 1 },
  { fund_id: 'PVII', name: 'Promus Ventures II, L.P.', type: 'fund',
    fmv: 81564116, cost: 5735501, unrealized_gain: 75828615,
    partners_capital: 82415504, contributed_capital: 13245052, distributed_capital: 2675135,
    as_of: '2025-12-31', audited: 1 },
  { fund_id: 'PVIII', name: 'Promus Ventures III, L.P.', type: 'fund',
    fmv: 22862959, cost: 10005122, unrealized_gain: 12857837,
    partners_capital: 23899257, contributed_capital: 14695000, distributed_capital: 2600000,
    as_of: '2025-12-31', audited: 1 },
  { fund_id: 'PVE', name: 'PV Expansion Fund I, L.P.', type: 'fund',
    fmv: 10249269, cost: 3607464, unrealized_gain: 6641805,
    partners_capital: 11441147, contributed_capital: 19517500, distributed_capital: 9758750,
    as_of: '2025-12-31', audited: 1 },
  { fund_id: 'PVMHalter', name: 'PVM Halter, LLC', type: 'spv',
    fmv: 39919123, cost: 9953698, unrealized_gain: 29965425,
    partners_capital: 40067637, contributed_capital: 10312813, distributed_capital: 0,
    as_of: '2025-12-31', audited: 0 },
  { fund_id: 'PVWhoop', name: 'PV Whoop, LLC', type: 'spv',
    fmv: 8531324, cost: 1400059, unrealized_gain: 7131265,
    partners_capital: 8501618, contributed_capital: 1560000, distributed_capital: 0,
    as_of: '2025-12-31', audited: 0 },
  { fund_id: 'PVMChef', name: 'PVM Chef, LLC', type: 'spv',
    fmv: 849998, cost: 849998, unrealized_gain: 0,
    partners_capital: 917455, contributed_capital: 950000, distributed_capital: 0,
    as_of: '2025-12-31', audited: 0 },
];

const insertFund = db.prepare(`INSERT INTO portfolio_funds 
  (fund_id, name, type, fmv, cost, unrealized_gain, partners_capital, contributed_capital, distributed_capital, as_of, audited)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

funds.forEach(f => insertFund.run(f.fund_id, f.name, f.type, f.fmv, f.cost, f.unrealized_gain,
  f.partners_capital, f.contributed_capital, f.distributed_capital, f.as_of, f.audited));

// ── HOLDINGS DATA (from SOI spreadsheet) ─────────────────────────────────
const insertHolding = db.prepare(`INSERT INTO portfolio_holdings
  (fund_id, company, date, round, shares, cost_per_share, fmv_per_share, cost, fair_value, unrealized_gain, change_in_fv, comments, as_of)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '2025-12-31')`);

const holdings = [
  // PVI
  ['PVI', 'WHOOP, Inc.', '2013-01-01', 'Series A/B/D/E', 0, 0, 11.3, 0, 130000000, 130000000, 0, 'Crown jewel — marked to Series G'],
  ['PVI', 'Bellabeat, Inc.', '2014-04-23', 'Series A-4 Preferred', 609681, 0.82, 25.17, 500000, 15344543, 14844543, -2192078, 'Q4 25 Additional 10% discount'],
  ['PVI', 'MapBox, Inc.', '2015-06-05', 'Series B Preferred', 20354, 8.60, 33.14, 175002, 674532, 499530, 0, ''],
  ['PVI', '500 Startups II, LP', '2013-01-31', 'Membership Interest', 42671, 0, 13.49, 0, 575834, 575834, 63531, 'Per Q3 25 PCAP'],
  ['PVI', 'AL-AngelList B-Fund', '2013-06-18', 'Series B Preferred Units', 93580, 1.07, 15.63, 100000, 1462937, 1362937, 3713, ''],
  ['PVI', 'Ambition Solutions', '2014-05-22', 'Series A Preferred', 63291, 3.95, 10.60, 250000, 670885, 420885, 0, ''],
  ['PVI', 'Swift Navigation', '2015-08-12', 'Series A Preferred', 365416, 1.37, 1.35, 499999, 493568, -6431, 0, 'Series E Round Oct 2024'],
  ['PVI', 'Opencare, Inc.', '2015-08-24', 'Series Seed B', 174441, 2.87, 6.48, 500000, 1130395, 630395, 0, ''],
  // PVII
  ['PVII', 'Halter USA, Inc.', '2017-07-27', 'Series A/A-1/B2/B1', 3265314, 0, 40.1411, 3606497, 131073979, 127467482, 58255138, 'FMV marked to Series E'],
  ['PVII', 'ICEYE Oy', '2018-05-02', 'Series B/C/D Preferred', 153471, 0, 21.03, 552114, 3227851, 2675737, -1294087, ''],
  ['PVII', 'Rhombus Systems', '2018-05-01', 'Series Seed-1 Preferred', 284705, 0.88, 8.8555, 249999, 2521205, 2271206, 0, 'FMV marked to Series C'],
  ['PVII', 'StatMuse, Inc.', '2016-01-06', 'Series A Preferred', 282262, 1.77, 7.62, 500000, 2150317, 1650317, -537579, 'Q4 25 - 20% discount'],
  ['PVII', 'Deako, Inc.', '2016-06-13', 'Series Seed/A/B', 2415485, 0, 0.35, 826891, 845904, 19013, 0, ''],
  // PVIII
  ['PVIII', 'ICEYE Oy', '2018-05-02', 'Series B/C/D Preferred', 419192, 0, 21.03, 1185338, 8816574, 7631236, -3534700, ''],
  ['PVIII', 'Rhombus Systems', '2018-05-02', 'Series Seed-1/4/A', 557142, 0, 8.8555, 608615, 4933770, 4325155, 0, 'Marked to Series C'],
  ['PVIII', 'Chef Robotics', '2021-02-10', 'Series Seed-2/A', 1127543, 0, 2.762, 1394466, 3114501, 1720035, 0, ''],
  ['PVIII', 'Safehub, Inc.', '2019-11-26', 'Series Seed-1/A-2', 2673866, 0, 0.7321, 1516026, 1957538, 441512, 0, ''],
  ['PVIII', 'Foundry Lab', '2020-03-02', 'Series A/A-2 Preferred', 127205, 0, 10.1925, 1249963, 1296537, 46574, 0, ''],
  ['PVIII', 'Earth AI', '2019-09-16', 'Series A-1', 527259, 0.9483, 1.2247, 500000, 645734, 145734, 0, ''],
  ['PVIII', 'Arch Systems', '2018-09-21', 'Series A Preferred', 229053, 2.18, 2.9133, 500000, 667300, 167300, 0, ''],
  ['PVIII', 'Biocogniv Inc.', '2020-09-05', 'Series Seed-4/5', 445282, 0, 1.31, 500000, 583334, 83334, 0, ''],
  // PVE
  ['PVE', 'WHOOP, Inc.', '2017-03-22', 'Series C/E Preferred', 529660, 0, 11.3, 207250, 5985158, 5777908, 3464823, 'Q4 25 Marked to Series G'],
  ['PVE', 'MapBox, Inc.', '2015-06-05', 'Series B Preferred', 61061, 8.60, 33.14, 524997, 2023562, 1498565, 0, ''],
  ['PVE', 'FLYR, Inc.', '2021-09-24', 'Series D-1', 300814, 7.13, 7.13, 2145017, 2145017, 0, 0, ''],
  ['PVE', 'Opencare, Inc.', '2018-03-16', 'Series A-2/3/Notes', 0, 0, 0, 113472, 81695, -31777, 0, ''],
  // PVM Halter
  ['PVMHalter', 'Halter USA, Inc.', '2019-05-24', 'Series B2/B1/C/D', 1789047, 0, 40.1411, 9953698, 71854455, 61900757, 28935345, '4 tranches'],
  // PV Whoop
  ['PVWhoop', 'WHOOP, Inc.', '2020-10-27', 'Series E Preferred', 759420, 1.8436, 11.3, 1400059, 8581446, 7181387, 4967822, ''],
  // PVM Chef
  ['PVMChef', 'Chef Robotics', '2024-11-06', 'Series A Preferred', 307725, 2.7622, 2.7622, 849998, 849998, 0, 0, 'At cost'],
];

holdings.forEach(h => insertHolding.run(...h));

console.log('Loaded', funds.length, 'funds');
console.log('Loaded', holdings.length, 'holdings');

// Summary
const total_fmv = funds.reduce((s, f) => s + f.fmv, 0);
const total_cost = funds.reduce((s, f) => s + f.cost, 0);
console.log(`\nTotal FMV: $${(total_fmv/1e6).toFixed(1)}M`);
console.log(`Total Cost: $${(total_cost/1e6).toFixed(1)}M`);
console.log(`Total Unrealized Gain: $${((total_fmv - total_cost)/1e6).toFixed(1)}M`);
