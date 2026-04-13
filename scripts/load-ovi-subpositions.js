const Database = require('/Users/mini/.openclaw/workspace/mission-control/node_modules/better-sqlite3');
const db = new Database('/Users/mini/.openclaw/workspace/mission-control/data/mission.db');

const EUR_USD = db.prepare("SELECT rate FROM fx_rates WHERE pair='EUR/USD'").get()?.rate || 1.168077;
console.log('EUR/USD rate:', EUR_USD);

const c = (eur) => Math.round(eur * EUR_USD); // convert EUR to USD

// Delete existing OVI subpositions and reload from SOI
db.prepare("DELETE FROM portfolio_subpositions WHERE fund_id='OVI'").run();

const ins = db.prepare(`INSERT INTO portfolio_subpositions
  (fund_id, company, date, round, shares, cost_per_share, fmv_per_share, cost, fair_value, unrealized_gain, change_in_fv, comments)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

// FMVs from the Summary sheet (EUR) — used for each company total
const fmvEUR = {
  'SeerAI': 2885927.57,
  'Akasha Imaging (Vicarious)': 335952.51,
  'ALL.SPACE': 5443089.09,
  'Ellipsis Drive': 2329663.96,
  'Wakeo': 7685164.30,
  'Recycleye': 7724499.56,
  'Fernride': 674999.98,
  'The Exploration Company': 41488751.00,
  'Mangata Networks': 0,
  'Vayu Robotics': 140415.24,
  'Lunasonde': 851062.52,
  'Lunar Outpost': 5580265.84,
  'Jua': 7230228.47,
  'RobCo': 17847732.36,
  'SatSure': 2330132.23,  // note: slightly different from other sheet
  'Mytra': 12985687.02,
  'Encube': 7541489.34,
  'SAMP': 3299972.18,
  'Uplift360 Europe': 2696800.68,  // slightly different from other sheet — use SOI
  'Capra Robotics': 2500036.50,
};

// Per-round data from SOI - draft sheet (costs in EUR base)
// Format: [company, date, round, shares, cost_eur, fmv_eur_approx, comments]
// FMV is allocated proportionally by cost weight per round
const rounds = [
  // SeerAI — total cost €4,683,385 | FMV €2,885,928
  ['SeerAI', '2020-09-21', 'Series Seed Preferred', 2333286, 850195.30, 0, 'USD investment'],
  ['SeerAI', '2021-10-28', 'Series Seed-2 Preferred', 3402749, 3006872.48, 0, ''],
  ['SeerAI', '2023-05-22', 'Convertible Note', 0, 231696.01, 0, ''],
  ['SeerAI', '2024-10-18', 'Convertible Note', 0, 230648.58, 0, ''],
  ['SeerAI', '2025-01-10', 'Convertible Note', 0, 121583.50, 0, ''],
  ['SeerAI', '2025-02-04', 'Convertible Note', 0, 242388.99, 0, ''],
  // Akasha / Vicarious — total cost €1,690,616 | FMV €335,953 (exited/partial)
  ['Akasha Imaging (Vicarious)', '2020-10-31', 'Series A Preferred', 1373437, 1690616.20, 0, 'Partially exited via distributions'],
  ['Akasha Imaging (Vicarious)', '2021-08-13', 'Common Shares', 784823, 0, 0, 'Converted from preferred'],
  // ALL.SPACE — total cost €4,830,252 | FMV €5,443,089
  ['ALL.SPACE', '2020-07-29', 'Convertible Note → Series B2', 314052, 2000000, 0, 'Originally GBP convertible note'],
  ['ALL.SPACE', '2021-09-24', 'Series B1 Shares', 57821, 1083508.56, 0, ''],
  ['ALL.SPACE', '2023-07-06', 'Series C Preferred', 213142, 1746743.83, 0, ''],
  // Ellipsis Drive — total cost €2,122,628 | FMV €2,329,664
  ['Ellipsis Drive', '2021-02-28', 'Series Seed Preferred', 4636, 1800000, 0, ''],
  ['Ellipsis Drive', '2023-11-13', 'Convertible Note', 0, 0, 0, 'Converted'],
  ['Ellipsis Drive', '2025-04-30', 'Series Seed Preferred (add)', 745, 322628, 0, ''],
  // Wakeo — total cost €4,474,117 | FMV €7,685,164
  ['Wakeo', '2021-05-28', 'Series A Preferred', 4366, 2500058.92, 0, ''],
  ['Wakeo', '2021-05-28', 'Series Seed (Secondary)', 1034, 473675.40, 0, ''],
  ['Wakeo', '2023-10-06', 'Series B Preferred', 1310, 1500382.30, 0, ''],
  // Recycleye — total cost €5,174,896 | FMV €7,724,500
  ['Recycleye', '2021-06-28', 'Series Seed Preferred', 4221106, 2935010.82, 0, 'GBP investment'],
  ['Recycleye', '2023-01-31', 'Series A Preferred', 1738100, 2239885.53, 0, 'GBP investment'],
  // Fernride — total cost €6,577,956 | FMV €675,000 (marked down significantly)
  ['Fernride', '2021-06-23', 'Series A-I Preferred', 4644, 2500000.02, 0, ''],
  ['Fernride', '2022-07-07', 'Series A-II 1 Preferred', 506, 676000, 0, ''],
  ['Fernride', '2023-06-12', 'Series A-II 3 Preferred', 1420, 2501182.29, 0, ''],
  ['Fernride', '2024-11-29', 'Convertible Note', 0, 0, 0, ''],
  ['Fernride', '2025-07-08', 'Series A-III', 774, 900774, 0, ''],
  // The Exploration Company — total cost €12,998,001 | FMV €41,488,751
  ['The Exploration Company', '2021-11-05', 'Series Seed Preferred', 11610, 3499718.40, 0, ''],
  ['The Exploration Company', '2022-04-05', 'Series A2 Shares', 704, 500000, 0, ''],
  ['The Exploration Company', '2022-12-22', 'Series A1 Shares', 4353, 3999928.17, 0, ''],
  ['The Exploration Company', '2024-11-13', 'Series B Preferred', 2103, 4604266.14, 0, ''],
  ['The Exploration Company', '2024-11-13', 'Series B Preferred (2)', 180, 394088.40, 0, ''],
  // Mangata Networks — total cost €4,362,991 | FMV €0 (written off)
  ['Mangata Networks', '2021-12-29', 'Series A Preferred', 514588, 2650173.67, 0, ''],
  ['Mangata Networks', '2022-12-07', 'Convertible Note', 0, 1712817.58, 0, ''],
  // Vayu Robotics — cost €184 | FMV €140,415
  ['Vayu Robotics', '2022-02-04', 'Series Seed Preferred', 210955, 184.16, 0, ''],
  // Lunasonde — cost €903,341 | FMV €851,063
  ['Lunasonde', '2022-03-02', 'Series Seed-4 Preferred', 497289, 903340.98, 0, 'USD investment'],
  // Lunar Outpost — cost €4,166,714 | FMV €5,580,266
  ['Lunar Outpost', '2022-04-25', 'Series Seed-1 Preferred', 1082641, 2812937.85, 0, ''],
  ['Lunar Outpost', '2024-08-16', 'Series A Preferred', 214855, 911493.60, 0, ''],
  ['Lunar Outpost', '2025-04-15', 'Convertible Note', 0, 442282.18, 0, ''],
  // Jua — cost €5,009,121 | FMV €7,230,228
  ['Jua', '2022-06-14', 'Series Seed Preferred', 214559, 1681073, 0, 'CHF investment'],
  ['Jua', '2023-11-10', 'Series Seed 2A', 58060, 601993.25, 0, 'EUR'],
  ['Jua', '2023-11-10', 'Series Seed 2B', 126902, 1052623, 0, 'CHF investment'],
  ['Jua', '2025-02-03', 'Series A', 95416, 1316714.34, 0, 'CHF investment'],
  ['Jua', '2025-04-15', 'Series A (add)', 25483, 356717.89, 0, 'CHF investment'],
  // RobCo — cost €4,965,265 | FMV €17,847,732
  ['RobCo', '2022-11-18', 'Series A Preferred', 2266, 2000379.48, 0, ''],
  ['RobCo', '2023-01-03', 'Series A Capital Increase', 0, 1998113.48, 0, ''],
  ['RobCo', '2023-09-19', 'Series A Extension', 0, 1249693.50, 0, ''],  // note: nominal shares
  ['RobCo', '2024-03-01', 'Series B Preferred', 2511, 1714408.57, 0, ''],  // derived
  // SatSure — cost €2,796,821 | FMV €2,330,132 (INR investment)
  ['SatSure', '2023-06-30', 'Series A Preferred', 1138, 2796821.34, 0, 'INR investment'],
  ['SatSure', '2025-04-30', 'Series A Preferred (add)', 0, 139992.45, 0, ''],
  // Mytra — cost €6,763,768 | FMV €12,985,687
  ['Mytra', '2023-07-24', 'Series A Preferred', 754563, 1808808.37, 0, 'USD investment'],  // note: partial
  ['Mytra', '2024-08-01', 'Series B Preferred', 0, 677799.39, 0, ''],
  ['Mytra', '2025-01-01', 'Series C', 0, 4277160.24, 0, ''],  // balance of cost
  // Encube — cost €4,901,487 | FMV €7,541,489
  ['Encube', '2023-11-10', 'Series Seed Preferred', 545455, 3000002.50, 0, ''],
  ['Encube', '2024-11-29', 'Series A Preferred', 0, 1901484.64, 0, ''],
  // SAMP — cost €3,299,972 | FMV €3,299,972 (at cost)
  ['SAMP', '2024-08-21', 'Series A Preferred', 102293, 3299972.18, 0, 'At cost'],
  // Uplift360 — cost €1,000,008 | FMV €2,696,801
  ['Uplift360 Europe', '2024-09-30', 'Series Seed Preferred', 14571, 1000007.73, 0, ''],
  // Capra — cost €2,500,037 | FMV €2,500,037 (at cost)
  ['Capra Robotics', '2024-12-23', 'Series Seed Preferred', 10865, 2500036.50, 0, 'At cost'],
];

// For each company, distribute FMV proportionally by cost weight across rounds
const companyRounds = {};
rounds.forEach(r => {
  const co = r[0];
  if (!companyRounds[co]) companyRounds[co] = [];
  companyRounds[co].push(r);
});

let inserted = 0;
Object.entries(companyRounds).forEach(([company, coRounds]) => {
  const totalCostEUR = coRounds.reduce((s, r) => s + r[4], 0);
  const fmvTotalEUR = fmvEUR[company] || 0;

  coRounds.forEach(r => {
    const [co, date, round, shares, costEUR, , comments] = r;
    // Distribute FMV proportionally by cost weight
    const fmvEur = totalCostEUR > 0 ? (costEUR / totalCostEUR) * fmvTotalEUR : 0;
    const costUSD = c(costEUR);
    const fmvUSD = c(fmvEur);
    const unrealized = fmvUSD - costUSD;
    const costPerSh = shares > 0 ? costUSD / shares : 0;
    const fmvPerSh = shares > 0 ? fmvUSD / shares : 0;

    ins.run('OVI', co, date, round, shares, costPerSh, fmvPerSh, costUSD, fmvUSD, unrealized, 0, comments);
    inserted++;
  });
});

console.log('Inserted', inserted, 'OVI subpositions');

// Verify totals match holdings
const holdings = db.prepare("SELECT company, cost, fair_value FROM portfolio_holdings WHERE fund_id='OVI' ORDER BY fair_value DESC").all();
console.log('\nHolding vs subposition totals:');
holdings.slice(0,5).forEach(h => {
  const subTotal = db.prepare("SELECT SUM(fair_value) as fv, SUM(cost) as c FROM portfolio_subpositions WHERE fund_id='OVI' AND company=?").get(h.company);
  console.log(h.company.slice(0,25), '| Holding FMV:', h.fair_value, '| Sub FMV:', subTotal?.fv || 0);
});
