#!/usr/bin/env node
/**
 * riley-meeting-scribe.js — Riley, the Meeting Scribe
 * Polls Granola for new meeting notes, extracts companies/people/action items,
 * logs to Mission Control, and sends digest to Telegram.
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const GRANOLA_KEY = 'grn_1CDS8DEwUbwEqVY1xp6NJvdp_K0qLqIr3QRIbwlz1wbTaWQxO0AVTqFyZT11nx4H5rHi0';
const ANTHROPIC_KEY = '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';
const BOT_TOKEN = '8395890971:AAHwb27dmD9SWCIfyvOToU5TXfMVAt-3aDo';
const CHAT_ID = '8345634392';
const STATE_FILE = path.join(__dirname, '../.riley-state.json');
const db = new Database(path.join(__dirname, '../mission-control/data/mission.db'));

// Ensure riley_notes table exists
db.exec(`CREATE TABLE IF NOT EXISTS riley_notes (
  id TEXT PRIMARY KEY,
  title TEXT,
  meeting_date TEXT,
  attendees TEXT,
  companies TEXT,
  action_items TEXT,
  summary TEXT,
  raw_summary TEXT,
  processed_at TEXT DEFAULT (datetime('now'))
)`);

function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch { return { processed: [] }; }
}
function saveState(state) { fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2)); }

async function getGranolaNotes() {
  const res = await fetch('https://public-api.granola.ai/v1/notes?limit=20', {
    headers: { 'Authorization': `Bearer ${GRANOLA_KEY}` }
  });
  const d = await res.json();
  return d.notes || [];
}

async function getGranolaNote(id) {
  const res = await fetch(`https://public-api.granola.ai/v1/notes/${id}`, {
    headers: { 'Authorization': `Bearer ${GRANOLA_KEY}` }
  });
  return res.json();
}

async function extractWithClaude(title, summary, attendees) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 600,
      messages: [{ role: 'user', content: `You are Riley, meeting scribe at Promus Ventures. Extract structured data from this meeting note.

Meeting: ${title}
Attendees: ${attendees}
Summary: ${summary.substring(0, 3000)}

Return JSON only:
{
  "companies": ["company names mentioned"],
  "people": [{"name": "...", "company": "...", "email": "..."}],
  "action_items": ["specific action items with owner if known"],
  "key_themes": ["main topics discussed"],
  "one_liner": "one sentence summary of the meeting"
}` }]
    })
  });
  const d = await res.json();
  const text = d.content?.[0]?.text || '{}';
  const match = text.match(/\{[\s\S]*\}/);
  try { return match ? JSON.parse(match[0]) : {}; } catch { return {}; }
}

async function sendTelegram(text) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT_ID, text: text.substring(0, 4000) }),
  }).catch(() => {});
}

async function main() {
  const state = loadState();
  console.log('Riley: Checking Granola for new meeting notes...');

  const notes = await getGranolaNotes();
  const newNotes = notes.filter(n => !state.processed.includes(n.id));

  if (!newNotes.length) {
    console.log('Riley: No new notes.');
    return;
  }

  console.log(`Riley: Found ${newNotes.length} new note(s)`);
  const processed = [];

  for (const note of newNotes) {
    console.log(`  → Processing: ${note.title}`);
    const full = await getGranolaNote(note.id);

    const attendeeNames = (full.attendees || []).map(a => a.name || a.email).join(', ');
    const summary = full.summary_text || full.summary_markdown || '';
    const meetingDate = (full.calendar_event?.scheduled_start_time || full.created_at || '').substring(0, 10);

    // Extract structured data
    const extracted = await extractWithClaude(note.title, summary, attendeeNames);

    // Save to DB
    db.prepare(`INSERT OR REPLACE INTO riley_notes 
      (id, title, meeting_date, attendees, companies, action_items, summary, raw_summary)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
      note.id,
      note.title,
      meetingDate,
      attendeeNames,
      JSON.stringify(extracted.companies || []),
      JSON.stringify(extracted.action_items || []),
      extracted.one_liner || '',
      summary.substring(0, 5000)
    );

    // Also log to Mission Control calendar as a meeting event
    const existing = db.prepare("SELECT id FROM calendar_events WHERE title = ? AND scheduled = ?").get(note.title, meetingDate);
    if (!existing) {
      db.prepare("INSERT INTO calendar_events (title, description, event_type, scheduled, source) VALUES (?, ?, ?, ?, ?)").run(
        note.title,
        extracted.one_liner || '',
        'meeting',
        meetingDate,
        'riley'
      );
    }

    // Auto-link to companies DB
    (extracted.companies || []).forEach(coName => {
      const co = db.prepare('SELECT id FROM companies WHERE name = ? COLLATE NOCASE').get(coName.trim());
      if (co) {
        const exists = db.prepare('SELECT id FROM interactions WHERE source_id = ? AND company_id = ?').get(note.id, co.id);
        if (!exists) {
          db.prepare("INSERT INTO interactions (company_id, type, title, date, source, source_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
            co.id, 'meeting', note.title, meetingDate, 'riley', note.id, extracted.one_liner || ''
          );
          db.prepare("UPDATE companies SET last_touched = ?, last_meeting_date = ?, last_meeting_title = ?, meeting_count = COALESCE(meeting_count,0)+1, updated = datetime('now') WHERE id = ?").run(meetingDate, meetingDate, note.title, co.id);
        }
      }
    });
    // Add new people to people DB
    (full.attendees || []).forEach(a => {
      if (!a.name || a.name === 'Mike Collett') return;
      const exists = db.prepare('SELECT id FROM people WHERE name = ? COLLATE NOCASE').get(a.name);
      if (!exists) {
        db.prepare("INSERT INTO people (name, email, last_meeting, source, notes) VALUES (?, ?, ?, ?, ?)").run(
          a.name, a.email || '', meetingDate, 'riley', note.title
        );
      } else {
        db.prepare("UPDATE people SET last_meeting = ?, updated = datetime('now') WHERE id = ?").run(meetingDate, exists.id);
      }
    });

    // Write meeting note back to Affinity
    try {
      const { findOrganization, createNote, findPerson } = require('./affinity-client');
      const affinityNote = `[Riley - Meeting Scribe] ${note.title}\n${meetingDate}\n\n${extracted.one_liner || ''}\n\nAttendees: ${attendeeNames}\n\nAction Items:\n${(extracted.action_items||[]).map(a=>'• '+a).join('\n')}`;
      // Find org IDs for companies mentioned
      const orgIds = [];
      for (const coName of (extracted.companies || []).slice(0, 3)) {
        const org = await findOrganization(coName);
        if (org) orgIds.push(org.id);
      }
      // Find person IDs for attendees
      const personIds = [];
      for (const name of (full.attendees||[]).slice(0,5)) {
        if (!name.name || name.name === 'Mike Collett') continue;
        const person = await findPerson(name.name);
        if (person) personIds.push(person.id);
      }
      if (orgIds.length || personIds.length) {
        await createNote(orgIds[0] || null, personIds, affinityNote);
        console.log('Riley: Wrote note to Affinity for', orgIds.length, 'orgs,', personIds.length, 'people');
      }
    } catch(e) { console.log('Riley: Affinity write failed:', e.message); }

    processed.push({ note, extracted, meetingDate, attendeeNames, summary });
    state.processed.push(note.id);
    await new Promise(r => setTimeout(r, 500));
  }

  // Send digest to Telegram
  for (const { note, extracted, meetingDate, attendeeNames } of processed) {
    const msg = [
      `📝 Riley's Meeting Note — ${meetingDate}`,
      `**${note.title}**`,
      ``,
      extracted.one_liner ? `💬 ${extracted.one_liner}` : '',
      ``,
      attendeeNames ? `👥 Attendees: ${attendeeNames}` : '',
      extracted.companies?.length ? `🏢 Companies: ${extracted.companies.join(', ')}` : '',
      extracted.action_items?.length ? `✅ Action Items:\n${extracted.action_items.map(a => `  • ${a}`).join('\n')}` : '',
      extracted.key_themes?.length ? `🔑 Themes: ${extracted.key_themes.join(', ')}` : '',
    ].filter(Boolean).join('\n');

    await sendTelegram(msg);
    console.log(`  ✅ ${note.title} — logged + sent to Telegram`);
  }

  saveState(state);
  console.log(`Riley: Done. Processed ${processed.length} note(s).`);
  db.close();
}

main().catch(err => { console.error('Riley error:', err.message); process.exit(1); });
