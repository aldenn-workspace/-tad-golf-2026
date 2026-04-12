#!/usr/bin/env node
/**
 * backfill-dropbox-summaries.js
 * Reprocesses all saved PDFs in Dropbox/Promus/Incoming Docs
 * and saves summaries to the Mission Control DB.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const Database = require('better-sqlite3');

const DROPBOX_DIR = path.join(process.env.HOME, 'Dropbox/Promus/Incoming Docs');
const ANTHROPIC_KEY = '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';
const BOT_TOKEN = '8395890971:AAHwb27dmD9SWCIfyvOToU5TXfMVAt-3aDo';
const CHAT_ID = '8345634392';

const db = new Database('/Users/mini/.openclaw/workspace/mission-control/data/mission.db');

async function summarize(company, filename, text) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-haiku-4-5', max_tokens: 350,
      messages: [{ role: 'user', content: `You are Drew, analyst at Promus Ventures. Summarize this pitch deck/document in 3-4 bullet points for Mike. Skip greetings. Focus on: what the company does, business model, funding ask/stage, traction, and why it might interest Promus (deep tech, space, AI, robotics, AgTech focus).

Company: ${company}
Filename: ${filename}
Document text: ${text.substring(0, 2500)}` }]
    })
  });
  const d = await res.json();
  return d.content?.[0]?.text || 'Could not summarize.';
}

async function main() {
  const files = fs.readdirSync(DROPBOX_DIR).filter(f => f.endsWith('.pdf'));
  console.log(`Found ${files.length} PDFs to process`);

  let updated = 0;
  for (const filename of files) {
    const filePath = path.join(DROPBOX_DIR, filename);
    
    // Parse company name from filename: "Company - DocType - Date.pdf"
    const parts = filename.replace('.pdf', '').split(' - ');
    const company = parts[0]?.trim() || 'Unknown';
    
    console.log(`  Processing: ${company}`);

    // Extract text
    let text = '';
    try {
      text = execSync(`python3 -c "from pdfminer.high_level import extract_text; print(extract_text('${filePath.replace(/'/g, "\\'")}'))"`, 
        { timeout: 15000 }).toString();
    } catch(e) {
      console.log(`    ⚠️ Could not extract text: ${e.message.substring(0,50)}`);
      continue;
    }

    if (text.trim().length < 50) {
      console.log(`    ⚠️ Too little text extracted, skipping`);
      continue;
    }

    // Summarize
    let summary = '';
    try {
      summary = await summarize(company, filename, text);
    } catch(e) {
      console.log(`    ⚠️ Summary failed: ${e.message.substring(0,50)}`);
      continue;
    }

    // Save to incoming_deals
    const deal = db.prepare("SELECT id FROM incoming_deals WHERE company_name LIKE ? OR deal_name LIKE ? LIMIT 1")
      .get('%' + company + '%', '%' + company + '%');
    if (deal) {
      db.prepare("UPDATE incoming_deals SET research_summary = ?, researched = 1, updated = datetime('now') WHERE id = ?")
        .run(summary.substring(0, 3000), deal.id);
      console.log(`    ✅ Saved to incoming deal: ${company}`);
    } else {
      console.log(`    — No matching deal found for: ${company}`);
    }

    // Save to companies DB
    const co = db.prepare('SELECT id FROM companies WHERE name LIKE ? COLLATE NOCASE LIMIT 1').get('%' + company + '%');
    if (co) {
      db.prepare("UPDATE companies SET drew_summary = ?, updated = datetime('now') WHERE id = ?")
        .run(summary.substring(0, 1000), co.id);
      console.log(`    ✅ Saved to company: ${company}`);
    }

    updated++;
    await new Promise(r => setTimeout(r, 800));
  }

  db.close();
  console.log(`\nDone. Processed ${updated}/${files.length} PDFs.`);
}

main().catch(e => { console.error(e.message); process.exit(1); });
