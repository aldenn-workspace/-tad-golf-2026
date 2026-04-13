const Database = require('/Users/mini/.openclaw/workspace/mission-control/node_modules/better-sqlite3');
const db = new Database('/Users/mini/.openclaw/workspace/mission-control/data/mission.db');

const insH = db.prepare(`INSERT OR IGNORE INTO portfolio_holdings
  (fund_id, company, date, round, shares, cost_per_share, fmv_per_share, cost, fair_value, unrealized_gain, change_in_fv, comments, as_of)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '2025-12-31')`);

const insS = db.prepare(`INSERT INTO portfolio_subpositions
  (fund_id, company, date, round, shares, cost_per_share, fmv_per_share, cost, fair_value, unrealized_gain, change_in_fv, comments)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

// Zero-FMV holdings from audits — alive but written to $0
const zeroHoldings = [
  // PVI
  ['PVI', 'True Fit Corporation', '2014-09-26', 'Common', 51168, 34.62, 0, 1699159, 0, -1699159, 0, 'Q3 25 Reverse Stock Split — written to zero'],
  ['PVI', 'Tulip.IO, Inc.', '2013-08-07', 'Common', 201701, 3.49, 0.56, 702921, 112953, -589968, 0, 'Written down; partial FMV remaining'],
  ['PVI', 'AudioDraft Ltd.', '2013-06-13', 'Convertible Note', 0, 0, 0, 150000, 0, -150000, 0, 'Convertible note — zero FMV'],
  ['PVI', 'Owner Listens, Inc.', '2013-03-25', 'Convertible Note', 0, 0, 0, 250000, 0, -250000, 0, 'Convertible note — zero FMV'],
  ['PVI', 'Demandbase, Inc.', '2018-05-04', 'Common', 168, 287.70, 0, 48333, 0, -48333, 0, 'Written to zero'],
  ['PVI', 'CodersClan Inc.', '2013-07-30', 'Common', 14698, 5.55, 5.55, 81544, 81544, 0, 0, 'At cost'],
  ['PVI', 'Hermes Topco, LLC', '2014-07-31', 'Class A Units', 960595, 1.00, 1.00, 960595, 960595, 0, 0, 'At cost'],
  ['PVI', 'Charlie Tango Romeo Holdings', '2015-04-07', 'Tracking Units', 61570, 0.29, 0, 17642, 192514, 174872, 274, 'Tracking units — blended FMV'],
  // PVIII
  ['PVIII', 'Diligent Robotics, Inc.', '2020-03-13', 'Common Shares', 239958, 4.17, 0.23, 999998, 55190, -944808, 0, 'Marked to 409a — near zero'],
  ['PVIII', 'SkyCurrent, LLC', '2022-07-14', 'SAFE', 0, 0, 0, 250000, 0, -250000, 0, 'Q1 25 likely unable to recover — zero FMV'],
  ['PVIII', 'The Expert Inc.', '2020-10-05', 'Common Stock', 968313, 1.20, 0.49, 1099998, 474472, -625526, 0, 'Mark to 409a valuation'],
  ['PVIII', 'Orbital Ventures S.C.A.', '2020-01-31', 'Fund Interest', 0, 0, 0, 200718, 318008, 117290, -949, 'Fund interest in OVI — marked above cost'],
  // PVE
  ['PVE', 'True Fit Corporation', '2016-01-05', 'Common', 9268, 61.82, 0, 567935, 0, -567935, 0, 'Q3 25 Reverse Stock Split — written to zero'],
  ['PVE', 'Hermes Topco, LLC', '2016-04-20', 'Class A Units', 48793, 1.00, 1.00, 48793, 48793, 0, 0, 'At cost'],
];

// Sub-positions for new holdings
const zeroSubs = [
  // PVI True Fit
  ['PVI','True Fit Corporation','2014-09-26','Common',39830,25.1066,0,1000000,0,-1000000,0,'Q3 25 Reverse Stock Split'],
  ['PVI','True Fit Corporation','2016-01-05','Common',8174,61.1707,0,500000,0,-500000,0,''],
  ['PVI','True Fit Corporation','2021-09-24','Common',3164,62.9394,0,199159,0,-199159,0,''],
  // PVI Tulip
  ['PVI','Tulip.IO, Inc.','2013-08-07','Common',100516,3.4820,0.56,350000,56289,-293711,0,''],
  ['PVI','Tulip.IO, Inc.','2014-05-07','Common',28719,3.4820,0.56,100000,16083,-83917,0,''],
  ['PVI','Tulip.IO, Inc.','2015-05-13','Common',18012,2.9382,0.56,52922,10087,-42835,0,''],
  ['PVI','Tulip.IO, Inc.','2016-02-29','Common',54454,3.6728,0.56,199999,30494,-169505,0,''],
  // PVIII The Expert
  ['PVIII','The Expert Inc.','2020-10-05','Common Stock',697641,0.7167,0.49,500000,341844,-158156,0,'Mark to 409a'],
  ['PVIII','The Expert Inc.','2022-03-14','Common Stock',270672,2.2167,0.49,599998,132628,-467370,0,'Mark to 409a'],
];

let added = 0;
zeroHoldings.forEach(h => {
  const r = insH.run(...h);
  if (r.changes) { console.log('✓ Added holding:', h[0], h[1], '| FMV:', h[7]); added++; }
});

zeroSubs.forEach(s => insS.run(...s));

console.log('\nAdded', added, 'new holdings');
console.log('Total holdings now:', db.prepare('SELECT COUNT(*) as n FROM portfolio_holdings').get().n);
