const AUTH = 'Basic ' + Buffer.from(':ylGvSZSuMURrSnQ0CXMlpb3YqeQtkRuBJPqiZa1xtrI').toString('base64');

async function get(path) {
  const r = await fetch('https://api.affinity.co' + path, { headers: { Authorization: AUTH } });
  return r.json();
}

async function test() {
  // Map all field IDs for list 192358
  const fields = await get('/fields?list_id=192358');
  console.log('=== ALL FIELDS ===');
  (Array.isArray(fields) ? fields : [fields]).forEach(f => 
    console.log(f.id, f.name, '| type:', f.value_type)
  );

  // Map user IDs to names (owner field values are user IDs)
  // Known: 1067014=Mike, 42908347=Pierre, 39216132=Gareth, 136746016=Estelle, 70986123=Jeremy
  const USER_MAP = {
    1067014: 'Mike Collett',
    42908347: 'Pierre Festal', 
    39216132: 'Gareth Keane',
    136746016: 'Estelle Godard',
    70986123: 'Jeremy Teboul',
  };

  // Get full field values for an LP with more data
  // Find an LP that has Estelle as owner (might have more fields)
  const Database = require('/Users/mini/.openclaw/workspace/mission-control/node_modules/better-sqlite3');
  const db = new Database('/Users/mini/.openclaw/workspace/mission-control/data/mission.db');
  const testLP = db.prepare("SELECT * FROM pv5_lps WHERE investor_type != '' AND previous_funds != '' LIMIT 1").get();
  console.log('\nTest LP:', testLP?.name, '| entry_id:', testLP?.affinity_list_entry_id);

  if (testLP) {
    const fv = await get(`/field-values?list_entry_id=${testLP.affinity_list_entry_id}`);
    console.log('\nField values:');
    if (Array.isArray(fv)) {
      fv.forEach(f => console.log(' field', f.field_id, '=', JSON.stringify(f.value)));
    }
  }
}

test().catch(e => console.error('ERROR:', e.message));
