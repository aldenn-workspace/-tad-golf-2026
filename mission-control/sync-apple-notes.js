#!/usr/bin/env node
/**
 * sync-apple-notes.js — Indexes Apple Notes to SQLite for fast search
 * Reads notes one at a time via AppleScript to avoid timeouts.
 * Run nightly or on demand.
 */

const { execSync } = require('child_process');
const Database = require('better-sqlite3');
const db = new Database('/Users/mini/.openclaw/workspace/mission-control/data/mission.db');

function osascript(script) {
  return execSync(`osascript -e '${script.replace(/'/g, "'\"'\"'")}'`, { timeout: 8000 }).toString().trim();
}

async function main() {
  console.log('Syncing Apple Notes...');
  const startTime = Date.now();

  // Get count first
  let noteCount = 0;
  try {
    const countStr = osascript('tell application "Notes" to get count of notes of default account');
    noteCount = parseInt(countStr) || 0;
  } catch(e) {
    console.error('Could not count notes:', e.message);
    process.exit(1);
  }
  console.log(`Found ${noteCount} notes`);

  // Clear existing index
  db.prepare('DELETE FROM apple_notes').run();

  const insert = db.prepare(`INSERT OR REPLACE INTO apple_notes 
    (note_index, title, content, modified, synced_at) 
    VALUES (?, ?, ?, ?, datetime('now'))`);

  let synced = 0, errors = 0;

  for (let i = 1; i <= noteCount; i++) {
    try {
      const title = osascript(`tell application "Notes" to get name of note ${i} of default account`);
      const content = osascript(`tell application "Notes" to get plaintext of note ${i} of default account`);
      const modified = osascript(`tell application "Notes" to get modification date of note ${i} of default account`);
      
      insert.run(i, title, content.substring(0, 10000), modified);
      synced++;
      
      if (synced % 10 === 0) process.stdout.write(`\r  ${synced}/${noteCount} synced...`);
    } catch(e) {
      errors++;
      // Skip this note and continue
    }
    
    // Small delay every 5 notes to avoid overwhelming AppleScript
    if (i % 5 === 0) await new Promise(r => setTimeout(r, 100));
  }

  // Rebuild FTS index
  try {
    db.prepare('INSERT INTO apple_notes_fts(apple_notes_fts) VALUES("rebuild")').run();
  } catch(e) {}

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
  console.log(`\n✅ Synced ${synced} notes in ${elapsed}s (${errors} errors)`);
  
  // Log to memory
  const total = db.prepare('SELECT COUNT(*) as n FROM apple_notes').get().n;
  console.log(`Total in index: ${total}`);
  
  db.close();
}

main().catch(e => { console.error(e.message); process.exit(1); });
