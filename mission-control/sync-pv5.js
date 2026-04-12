'use strict';

/**
 * PV5 LP Sync - syncs from Affinity CRM list to local pv5_lps table
 */

const AffinityClient = require('./affinity-client');

// Map Affinity status values to rank order for sorting
const STATUS_RANK = {
  'Committed': 0,
  'Soft Circle': 1,
  'High Interest': 2,
  'In Discussion': 3,
  'Outreach': 4,
  'Passed': 5,
  'Dormant': 6,
};

async function syncPv5(db) {
  const client = new AffinityClient();

  // Find the PV5 list
  const lists = await client.getLists();
  const pv5List = (lists.lists || lists).find(l =>
    l.name && (l.name.includes('PV5') || l.name.includes('Fund 5') || l.name.includes('Fund V'))
  );

  if (!pv5List) {
    throw new Error('PV5 list not found in Affinity. Available lists: ' +
      (lists.lists || lists).map(l => l.name).join(', '));
  }

  console.log(`Found PV5 list: ${pv5List.name} (id=${pv5List.id})`);

  const entries = await client.getAllListEntries(pv5List.id);
  console.log(`Fetched ${entries.length} list entries`);

  let upserted = 0;
  const stmt = db.prepare(`
    INSERT INTO pv5_lps (affinity_entity_id, affinity_list_entry_id, name, status, status_rank, last_synced)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(affinity_entity_id) DO UPDATE SET
      affinity_list_entry_id = excluded.affinity_list_entry_id,
      name = excluded.name,
      status = excluded.status,
      status_rank = excluded.status_rank,
      last_synced = excluded.last_synced,
      updated = datetime('now')
  `);

  for (const entry of entries) {
    const entity = entry.entity || {};
    const entityId = String(entry.entity_id || entity.id || '');
    const listEntryId = String(entry.id || '');
    const name = entity.name || entity.primary_display_value || 'Unknown';
    const status = entry.stage || '';
    const rank = STATUS_RANK[status] ?? 99;

    if (!entityId) continue;
    stmt.run(entityId, listEntryId, name, status, rank);
    upserted++;
  }

  return { synced: upserted, list: pv5List.name };
}

module.exports = syncPv5;
