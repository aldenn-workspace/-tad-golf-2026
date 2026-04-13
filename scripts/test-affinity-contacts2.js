const AUTH = 'Basic ' + Buffer.from(':ylGvSZSuMURrSnQ0CXMlpb3YqeQtkRuBJPqiZa1xtrI').toString('base64');

async function get(path) {
  const r = await fetch('https://api.affinity.co' + path, { headers: { Authorization: AUTH } });
  return r.json();
}

async function test() {
  // Test Schroders Adveq - has person_ids: [172187714]
  // Find its list entry
  const Database = require('/Users/mini/.openclaw/workspace/mission-control/node_modules/better-sqlite3');
  const db = new Database('/Users/mini/.openclaw/workspace/mission-control/data/mission.db');
  const schroders = db.prepare("SELECT * FROM pv5_lps WHERE name LIKE '%Schroders Adveq%'").get();
  console.log('Schroders entry:', schroders?.name, '| entity_id:', schroders?.affinity_entity_id, '| entry_id:', schroders?.affinity_list_entry_id);

  // Get opportunity
  const opp = await get('/opportunities/' + schroders.affinity_entity_id);
  console.log('person_ids:', opp.person_ids);
  console.log('org_ids:', opp.organization_ids);

  // Fetch the person
  if (opp.person_ids?.length) {
    const person = await get('/persons/' + opp.person_ids[0]);
    console.log('Person:', person.first_name, person.last_name, person.primary_email, person.title);
  }

  // Test Infinitas - no person_ids, should return empty
  const infinitas = db.prepare("SELECT * FROM pv5_lps WHERE name LIKE '%Infinitas%' LIMIT 1").get();
  const opp2 = await get('/opportunities/' + infinitas.affinity_entity_id);
  console.log('\nInfinitas person_ids:', opp2.person_ids, '(should be empty)');
  console.log('Infinitas org_ids:', opp2.organization_ids);
  
  // Try fetching org for domain
  if (opp2.organization_ids?.length) {
    const org = await get('/organizations/' + opp2.organization_ids[0]);
    console.log('Org domain:', org.domain || org._raw || JSON.stringify(org).slice(0,100));
  }
}

test().catch(e => console.error('ERROR:', e.message));
