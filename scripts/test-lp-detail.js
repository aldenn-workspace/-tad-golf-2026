// Simulate openPV5Detail logic to find the exact JS error
const PV5_STAGE_COLORS = {
  'Committed': '#22c55e',
  'New LP - No Rlnship': '#94a3b8',
  'Interested': '#7c6ff7',
};

const lp = {
  id: 1,
  name: 'Infinitas Capital',
  status: 'New LP - No Rlnship',
  investor_type: 'Fund of Fund',
  aum: 0,
  location: '',
  owner: '42908347',
  investment_potential: '',
  fund2_commitment: 0,
  previous_funds: '',
  domain: '',
  close_date: '',
  notes: '',
  affinity_list_entry_id: '188407536',
  affinity_entity_id: '96927276'
};

// Test the innerHTML template
const color = PV5_STAGE_COLORS[lp.status] || '#94a3b8';

try {
  const html = `
    <div>
      <div>${lp.name}</div>
      <span style="background:${color}22;color:${color};border:1px solid ${color}44">${lp.status}</span>
      <button onclick="document.getElementById('pv5-detail-panel').remove();document.querySelectorAll('[style*=\"z-index:499\"]').forEach(e=>e.remove())">✕</button>
    </div>
    <div>
      ${lp.investor_type ? `<div>Type: ${lp.investor_type}</div>` : ''}
      ${lp.aum ? `<div>AUM: ${lp.aum}</div>` : ''}
      ${lp.owner && !/^\d+$/.test(lp.owner.trim()) ? `<div>Owner: ${lp.owner}</div>` : ''}
      ${lp.notes ? `<div>${lp.notes}</div>` : ''}
    </div>
  `;
  console.log('HTML generation OK, length:', html.length);
} catch(e) {
  console.log('HTML generation ERROR:', e.message);
}

// Test owner check - this might be the bug
console.log('owner value:', JSON.stringify(lp.owner));
console.log('owner is numeric:', /^\d+$/.test((lp.owner||'').trim()));
// If owner is a numeric ID string, it gets filtered out - correct
// But what if owner is null?
const testOwner = null;
try {
  const result = testOwner && !/^\d+$/.test(testOwner.trim());
  console.log('null owner test OK:', result);
} catch(e) {
  console.log('null owner ERROR:', e.message);
}
