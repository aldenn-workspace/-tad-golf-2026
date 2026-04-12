#!/usr/bin/env node
const Anthropic = require('/Users/mini/.openclaw/workspace/node_modules/@anthropic-ai/sdk');
const Database = require('/Users/mini/.openclaw/workspace/mission-control/node_modules/better-sqlite3');

const db = new Database('/Users/mini/.openclaw/workspace/mission-control/data/mission.db');
const notes = db.prepare(`
  SELECT title, content, modified FROM apple_notes 
  WHERE title LIKE '%ephesian%' OR content LIKE '%ephesian%' OR title LIKE '%Eph %' OR title LIKE '%Eph.%'
  ORDER BY modified ASC
`).all();

const notesText = notes.map(n => '### ' + n.title + '\n' + (n.content||'').slice(0,2000)).join('\n\n---\n\n');

const client = new Anthropic.default();

async function run() {
  console.error('Generating Ephesians report from', notes.length, 'notes...');
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    messages: [{
      role: 'user',
      content: `You are synthesizing Mike Collett's personal small group and Bible study notes on the book of Ephesians, taken from Sept 2025 through Jan 2026. The small group met at the Collett home.

Your task: Create a structured report organized by the chapters and verses of Ephesians IN ORDER (chapters 1 through 6). For each section covered in Mike's notes, pull out:
- Key themes and insights
- Memorable quotes or illustrations from teachers (Alistair Begg, John Stott, etc.)
- Personal observations and applications
- Notable questions or reflections

Keep it warm and personal. These are his own notes from a study he was deeply engaged in.

NOTES:

` + notesText
    }]
  });
  console.log(msg.content[0].text);
}

run().catch(e => { console.error('Error:', e.message); process.exit(1); });
