const AUTH = 'Basic ' + Buffer.from(':ylGvSZSuMURrSnQ0CXMlpb3YqeQtkRuBJPqiZa1xtrI').toString('base64');

async function test() {
  // Test with a known LP - AG Insurance has investor_type set
  const Database = require('/Users/mini/.openclaw/workspace/mission-control/node_modules/better-sqlite3');
  const db = new Database('/Users/mini/.openclaw/workspace/mission-control/data/mission.db');
  
  // Find LP with investor_type and owner
  const lp = db.prepare("SELECT * FROM pv5_lps WHERE investor_type != '' AND owner != '' LIMIT 1").get();
  console.log('Testing LP:', lp.name, '| entity_id:', lp.affinity_entity_id, '| list_entry_id:', lp.affinity_list_entry_id);
  console.log('owner_name:', lp.owner_name, '| investor_type:', lp.investor_type);

  // Test 1: current lp-contacts endpoint (uses list_entry_id as opportunity_id - WRONG)
  const r1 = await fetch(`https://api.affinity.co/opportunities/${lp.affinity_list_entry_id}`, { headers: { Authorization: AUTH } });
  const d1 = await r1.json();
  console.log('\n[WRONG] /opportunities/list_entry_id status:', r1.status, JSON.stringify(d1).slice(0,100));

  // Test 2: organization endpoint with entity_id (correct)
  const r2 = await fetch(`https://api.affinity.co/organizations/${lp.affinity_entity_id}`, { headers: { Authorization: AUTH } });
  const d2 = await r2.json();
  console.log('\n[ORG] /organizations/entity_id status:', r2.status);
  if (d2.name) {
    console.log('Org name:', d2.name);
    console.log('Person IDs:', d2.person_ids?.slice(0,5));
  } else {
    console.log(JSON.stringify(d2).slice(0,200));
  }

  // Test 3: list entry endpoint
  const r3 = await fetch(`https://api.affinity.co/lists/192358/list-entries/${lp.affinity_list_entry_id}`, { headers: { Authorization: AUTH } });
  const d3 = await r3.json();
  console.log('\n[LIST ENTRY] status:', r3.status, JSON.stringify(d3).slice(0,200));

  // Test 4: if org has person_ids, fetch first person
  if (d2.person_ids?.length) {
    const pid = d2.person_ids[0];
    const r4 = await fetch(`https://api.affinity.co/persons/${pid}`, { headers: { Authorization: AUTH } });
    const d4 = await r4.json();
    console.log('\n[PERSON]', d4.first_name, d4.last_name, d4.primary_email, d4.title);
  }
}

test().catch(e => console.error('ERROR:', e.message));
