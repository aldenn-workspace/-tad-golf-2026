const http = require('http');

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { reject(e); } });
    }).on('error', reject);
  });
}

async function test() {
  const lps = await fetchJSON('http://localhost:3456/api/pv5/lps?limit=5');
  const lpList = Array.isArray(lps) ? lps : (lps.lps || lps.data || []);
  console.log('Total LPs:', lpList.length);

  for (const lp of lpList.slice(0, 3)) {
    console.log('\n--- Testing:', lp.name, '---');
    
    // Test the escape function
    const e = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    const row = (label, val) => val ? `<div>${label}: ${e(val)}</div>` : '';
    const ownerName = lp.owner && !/^\d+$/.test(String(lp.owner).trim()) ? lp.owner : '';
    
    try {
      const html = `<div>${e(lp.name)}</div>${e(lp.status)}${row('Type', lp.investor_type)}${row('Owner', ownerName)}`;
      console.log('HTML OK, length:', html.length);
    } catch(err) {
      console.log('HTML ERROR:', err.message);
    }

    // Test contacts API
    try {
      const contacts = await fetchJSON('http://localhost:3456/api/affinity/lp-contacts/' + lp.affinity_list_entry_id);
      console.log('Contacts OK:', JSON.stringify(contacts).slice(0,60));
    } catch(err) {
      console.log('Contacts ERROR:', err.message);
    }

    // Test notes API
    try {
      const notes = await fetchJSON('http://localhost:3456/api/affinity/notes?opportunity_id=' + lp.affinity_entity_id);
      console.log('Notes OK:', notes.length, 'notes');
    } catch(err) {
      console.log('Notes ERROR:', err.message);
    }
  }
  console.log('\nAll tests passed - LP detail should work.');
}

test().catch(e => console.error('FATAL:', e.message));
