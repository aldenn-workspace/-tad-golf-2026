const https = require('https');
const Database = require('/Users/mini/.openclaw/workspace/mission-control/node_modules/better-sqlite3');
const db = new Database('/Users/mini/.openclaw/workspace/mission-control/data/mission.db');

https.get('https://open.er-api.com/v6/latest/EUR', res => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      const newRate = json.rates.USD;
      const oldRateRow = db.prepare("SELECT rate FROM fx_rates WHERE pair='EUR/USD'").get();
      const oldRate = oldRateRow ? oldRateRow.rate : 1.0;
      const adj = newRate / oldRate; // adjustment multiplier

      db.prepare('INSERT OR REPLACE INTO fx_rates (pair, rate, updated) VALUES (?,?,?)').run('EUR/USD', newRate, new Date().toISOString());

      // Adjust OVI figures by ratio of new/old rate
      db.prepare("UPDATE portfolio_funds SET fmv=ROUND(fmv*?), cost=ROUND(cost*?), unrealized_gain=ROUND(unrealized_gain*?), contributed_capital=ROUND(contributed_capital*?) WHERE fund_id='OVI'").run(adj, adj, adj, adj);
      db.prepare("UPDATE portfolio_holdings SET fair_value=ROUND(fair_value*?), cost=ROUND(cost*?), unrealized_gain=ROUND(unrealized_gain*?), change_in_fv=ROUND(change_in_fv*?) WHERE fund_id='OVI'").run(adj, adj, adj, adj);
      db.prepare("UPDATE portfolio_subpositions SET fair_value=ROUND(fair_value*?), cost=ROUND(cost*?), unrealized_gain=ROUND(unrealized_gain*?), change_in_fv=ROUND(change_in_fv*?) WHERE fund_id='OVI'").run(adj, adj, adj, adj);

      console.log(`EUR/USD updated: ${oldRate.toFixed(4)} → ${newRate.toFixed(4)} (adj: ${adj.toFixed(6)})`);
    } catch(e) { console.error('FX update failed:', e.message); }
  });
}).on('error', e => console.error('FX fetch error:', e.message));
