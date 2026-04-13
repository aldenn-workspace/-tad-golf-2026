const AUTH = 'Basic ' + Buffer.from(':ylGvSZSuMURrSnQ0CXMlpb3YqeQtkRuBJPqiZa1xtrI').toString('base64');

async function get(path) {
  const r = await fetch('https://api.affinity.co' + path, { headers: { Authorization: AUTH } });
  const text = await r.text();
  try { return { status: r.status, data: JSON.parse(text) }; } 
  catch(e) { return { status: r.status, data: text.slice(0,300) }; }
}

async function test() {
  // The LP list entity_type=8. Let's find what global entity IDs look like
  // Try fetching the entity using /v1 global search
  const s1 = await get('/organizations?term=Infinitas+Capital&page_size=3');
  console.log('GET /organizations search:', s1.status, JSON.stringify(s1.data).slice(0,400));

  // Try with the actual Affinity entity endpoint
  const s2 = await get('/persons?organization_ids[]=96927276&page_size=5');
  console.log('\nGET /persons?organization_ids:', s2.status, JSON.stringify(s2.data).slice(0,400));

  // Check what's on the list entry itself - maybe there's a linked_organization_id
  const s3 = await get('/lists/192358/list-entries?page_size=1');
  const entry = s3.data?.list_entries?.[0];
  console.log('\nFull list entry:', JSON.stringify(entry));

  // Try fetching entity details with entity_type=8 specific endpoint
  const s4 = await get('/entities/96927276');
  console.log('\nGET /entities/:', s4.status, JSON.stringify(s4.data).slice(0,300));

  // Try notes with various params
  const s5 = await get('/notes?entity_id=96927276&page_size=5');
  console.log('\nGET /notes?entity_id:', s5.status, JSON.stringify(s5.data).slice(0,300));

  // Try notes with list_entry_id
  const s6 = await get('/notes?list_entry_id=188407536&page_size=5');
  console.log('\nGET /notes?list_entry_id:', s6.status, JSON.stringify(s6.data).slice(0,300));

  // Search globally for Infinitas Capital to find their org record
  const s7 = await get('/search?term=Infinitas+Capital');
  console.log('\nGET /search:', s7.status, JSON.stringify(s7.data).slice(0,400));
}

test().catch(e => console.error('ERROR:', e.message));
