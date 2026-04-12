#!/usr/bin/env node
/**
 * add-mike-as-owner.js
 * Adds Mike Collett (1067014) as co-owner on all PV5 LPs where
 * Pierre, Estelle, Jeremy, or Gareth are owners but Mike is not.
 */

const Database = require('better-sqlite3');
const db = new Database('/Users/mini/.openclaw/workspace/mission-control/data/mission.db');

const AUTH = 'Basic ' + Buffer.from(':ylGvSZSuMURrSnQ0CXMlpb3YqeQtkRuBJPqiZa1xtrI').toString('base64');
const MIKE_ID = 1067014;
const OWNER_FIELD_ID = 3590815;
const LIST_ID = 192358;

// Known non-Mike owner IDs (will add more as we discover them)
const TARGET_OWNER_IDS = new Set([
  42908347,   // Pierre Festal
  136746016,  // Estelle Godard
]);

async function addOwner(listEntryId, opportunityId) {
  const res = await fetch('https://api.affinity.co/field-values', {
    method: 'POST',
    headers: { Authorization: AUTH, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      field_id: OWNER_FIELD_ID,
      list_entry_id: parseInt(listEntryId),
      entity_id: parseInt(opportunityId),
      value: MIKE_ID,
    }),
  });
  return res.json();
}

async function main() {
  const lps = db.prepare('SELECT affinity_entity_id, affinity_list_entry_id, name FROM pv5_lps').all();
  console.log(`Checking ${lps.length} LPs for non-Mike owners...`);

  let checked = 0, updated = 0, errors = 0;

  for (let i = 0; i < lps.length; i += 10) {
    const batch = lps.slice(i, i + 10);
    await Promise.all(batch.map(async lp => {
      try {
        const r = await fetch(`https://api.affinity.co/field-values?list_entry_id=${lp.affinity_list_entry_id}`, { headers: { Authorization: AUTH } });
        const d = await r.json();
        const fvs = Array.isArray(d) ? d.filter(x => typeof x === 'object') : [];
        const ownerFvs = fvs.filter(fv => fv.field_id === OWNER_FIELD_ID);
        const ownerIds = new Set(ownerFvs.map(fv => fv.value));

        // Discover new non-Mike owner IDs
        ownerIds.forEach(id => { if (id !== MIKE_ID) TARGET_OWNER_IDS.add(id); });

        // Add Mike if: has at least one owner AND Mike not already there
        if (ownerIds.size > 0 && !ownerIds.has(MIKE_ID)) {
          const result = await addOwner(lp.affinity_list_entry_id, lp.affinity_entity_id);
          if (result.id || result.field_id) {
            console.log(`  ✅ Added Mike to: ${lp.name}`);
            updated++;
          } else {
            console.log(`  ❌ Failed for ${lp.name}:`, JSON.stringify(result).substring(0, 100));
            errors++;
          }
        }
        checked++;
      } catch(e) {
        console.log(`  Error on ${lp.name}:`, e.message);
        errors++;
      }
    }));
    process.stdout.write(`\r  Progress: ${Math.min(i+10, lps.length)}/${lps.length} checked, ${updated} updated`);
    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`\n\nDone! Checked: ${checked} | Updated: ${updated} | Errors: ${errors}`);
  console.log('All owner IDs found:', [...TARGET_OWNER_IDS]);
  db.close();
}

main().catch(e => { console.error(e.message); process.exit(1); });
