const Database = require('/Users/mini/.openclaw/workspace/mission-control/node_modules/better-sqlite3');
const db = new Database('/Users/mini/.openclaw/workspace/mission-control/data/mission.db');

const fvData = [
  ['The Exploration Company', 41488751, 12998001, 0],
  ['RobCo', 17847732, 4965265, 4534050],
  ['Mytra', 12985687, 6763768, -77907],
  ['Encube', 7541489, 4901487, 3000003],
  ['Recycleye', 7724500, 5174896, -40099],
  ['Jua', 7230228, 5009121, 1298806],
  ['Wakeo', 7685164, 4474117, 4593016],
  ['Lunar Outpost', 5580266, 4166714, -116859],
  ['ALL.SPACE', 5443089, 4830252, -325367],
  ['SeerAI', 2885928, 4683385, -239560],
  ['Ellipsis Drive', 2329664, 2122628, 302042],
  ['SatSure', 2452986, 2936814, -118275],
  ['Fernride', 675000, 6577182, 0],
  ['Mangata Networks', 0, 4362991, -174444],
  ['Capra Robotics', 2500037, 2500037, 0],
  ['SAMP', 3299972, 3299972, 0],
  ['Uplift360 Europe', 3196702, 1499909, 0],
  ['Lunasonde', 851063, 903341, -38953],
  ['Akasha Imaging (Vicarious)', 335953, 1690616, -15376],
  ['Vayu Robotics', 140415, 184, -18395],
];

const update = db.prepare(`UPDATE portfolio_holdings SET fair_value=?, cost=?, change_in_fv=?, unrealized_gain=fair_value-cost WHERE fund_id='OVI' AND company LIKE ?`);

let updated = 0;
fvData.forEach(([name, fv, cost, chg]) => {
  const r = update.run(fv, cost, chg, '%' + name.split(' ')[0] + '%');
  if (r.changes) { console.log('✓', name, '| FV:', (fv/1e6).toFixed(2)+'M'); updated++; }
  else console.log('✗ NOT FOUND:', name);
});
console.log('\nUpdated:', updated, 'of', fvData.length);

// Update fund total FMV
const totalFMV = fvData.reduce((s, d) => s + d[0], 0);
db.prepare("UPDATE portfolio_funds SET fmv=?, unrealized_gain=fmv-cost WHERE fund_id='OVI'").run(totalFMV);
console.log('Orbital total FMV: €' + (totalFMV/1e6).toFixed(1) + 'M');
