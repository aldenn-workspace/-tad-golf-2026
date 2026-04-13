const AUTH = 'Basic ' + Buffer.from(':ylGvSZSuMURrSnQ0CXMlpb3YqeQtkRuBJPqiZa1xtrI').toString('base64');

async function get(path) {
  const r = await fetch('https://api.affinity.co' + path, { headers: { Authorization: AUTH } });
  return r.json();
}

async function test() {
  // Schroders Adveq: entity_id=96819634, list_entry_id=187981414
  
  // Test 1: notes by opportunity_id (entity_id)
  const n1 = await get('/notes?opportunity_id=96819634&page_size=5');
  console.log('notes?opportunity_id=entity_id:', n1.notes?.length, 'notes');
  n1.notes?.forEach(n => console.log(' -', n.content?.slice(0,80)));

  // Test 2: notes using opportunity_ids array
  const n2 = await get('/notes?opportunity_ids[]=96819634&page_size=5');
  console.log('\nnotes?opportunity_ids[]:', n2.notes?.length, 'notes');
  n2.notes?.forEach(n => console.log(' -', n.content?.slice(0,80)));

  // Test 3: what does entity_id=96819634 actually return?
  const n3 = await get('/notes?entity_id=96819634&page_size=5');
  console.log('\nnotes?entity_id:', n3.notes?.length, 'notes');
  n3.notes?.slice(0,3).forEach(n => {
    console.log(' - opp_ids:', n.opportunity_ids, 'org_ids:', n.organization_ids, 'person_ids:', n.person_ids);
    console.log('   content:', n.content?.slice(0,80));
  });

  // Test 4: Infinitas notes
  const n4 = await get('/notes?opportunity_id=96927276&page_size=5');
  console.log('\nInfinitas notes?opportunity_id:', n4.notes?.length);
  n4.notes?.forEach(n => console.log(' -', n.content?.slice(0,80)));
}

test().catch(e => console.error('ERROR:', e.message));
