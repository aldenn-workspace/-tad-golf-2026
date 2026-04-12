#!/usr/bin/env node
/**
 * sync-apple-notes.js — Indexes Apple Notes to SQLite for fast search
 * Reads directly from NoteStore.sqlite (requires Full Disk Access for node).
 * Run nightly or on demand.
 */

const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

const NOTES_DB = path.join(os.homedir(), 'Library/Group Containers/group.com.apple.notes/NoteStore.sqlite');
const MC_DB = path.join(__dirname, 'data/mission.db');

function main() {
  console.log('Syncing Apple Notes via direct DB read...');
  const startTime = Date.now();

  const notesDb = new Database(NOTES_DB, { readonly: true });
  const mcDb = new Database(MC_DB);

  // Ensure table exists
  mcDb.exec(`
    CREATE TABLE IF NOT EXISTS apple_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      note_index INTEGER UNIQUE,
      title TEXT NOT NULL,
      content TEXT DEFAULT '',
      modified TEXT DEFAULT '',
      folder TEXT DEFAULT '',
      synced_at TEXT DEFAULT (datetime('now'))
    )
  `);
  try { mcDb.exec('ALTER TABLE apple_notes ADD COLUMN folder TEXT DEFAULT ""'); } catch(e) {}

  // Read all non-deleted notes from NoteStore
  const notes = notesDb.prepare(`
    SELECT
      Z_PK as pk,
      ZTITLE1 as title,
      ZSNIPPET as snippet,
      ZMODIFICATIONDATE1 as modified
    FROM ZICCLOUDSYNCINGOBJECT
    WHERE ZTITLE1 IS NOT NULL
      AND ZMARKEDFORDELETION = 0
    ORDER BY ZMODIFICATIONDATE1 DESC
  `).all();

  console.log(`Found ${notes.length} notes in NoteStore`);

  const upsert = mcDb.prepare(`
    INSERT INTO apple_notes (note_index, title, content, modified, synced_at)
    VALUES (?, ?, ?, datetime(? + 978307200, 'unixepoch', 'localtime'), datetime('now'))
    ON CONFLICT(note_index) DO UPDATE SET
      title = excluded.title,
      content = excluded.content,
      modified = excluded.modified,
      synced_at = excluded.synced_at
  `);

  const syncAll = mcDb.transaction((notes) => {
    for (const n of notes) {
      upsert.run(n.pk, n.title || 'Untitled', n.snippet || '', n.modified || 0);
    }
    return notes.length;
  });

  const synced = syncAll(notes);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  const total = mcDb.prepare('SELECT COUNT(*) as n FROM apple_notes').get();
  console.log(`Synced ${synced} notes in ${elapsed}s. Total in DB: ${total.n}`);
}

try {
  main();
} catch(e) {
  console.error('Sync failed:', e.message);
  process.exit(1);
}
