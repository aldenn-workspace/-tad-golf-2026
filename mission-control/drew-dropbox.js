#!/usr/bin/env node
/**
 * drew-dropbox.js — Drew saves email attachments to Dropbox
 * Scans newdeals@promusventures.com for emails with attachments,
 * downloads them, identifies the company, saves to Dropbox, summarizes.
 */

const fs = require('fs');
const path = require('path');

const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, '../deal-intake-outlook-config.json'), 'utf8'));
const ANTHROPIC_KEY = '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';
const BOT_TOKEN = '8395890971:AAHwb27dmD9SWCIfyvOToU5TXfMVAt-3aDo';
const CHAT_ID = '8345634392';
const DROPBOX_DIR = path.join(process.env.HOME, 'Dropbox/Promus/Incoming Docs');
const STATE_FILE = path.join(__dirname, '.drew-dropbox-state.json');

function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } 
  catch { return { processed: [] }; }
}
function saveState(s) { fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2)); }

async function getToken() {
  const res = await fetch(`https://login.microsoftonline.com/${cfg.tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: cfg.clientId, client_secret: cfg.clientSecret,
      scope: 'https://graph.microsoft.com/.default', grant_type: 'client_credentials',
    }),
  });
  const d = await res.json();
  if (!d.access_token) throw new Error('Token failed');
  return d.access_token;
}

async function getMessagesWithAttachments(token) {
  const startDate = '2026-01-01';
  const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(cfg.mailbox)}/messages` +
    `?$top=50&$select=id,subject,from,receivedDateTime,hasAttachments,internetMessageId` +
    `&$filter=receivedDateTime ge ${startDate}T00:00:00Z AND hasAttachments eq true` +
    `&$orderby=receivedDateTime desc`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const d = await res.json();
  return d.value || [];
}

async function getAttachments(token, messageId) {
  const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(cfg.mailbox)}/messages/${messageId}/attachments`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const d = await res.json();
  return (d.value || []).filter(a => a['@odata.type'] === '#microsoft.graph.fileAttachment');
}

async function identifyCompanyAndType(subject, filename) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-haiku-4-5', max_tokens: 150,
      messages: [{ role: 'user', content: `From this email subject and filename, extract the company name and document type. Return JSON only: {"company": "...", "doc_type": "Board Deck|Term Sheet|Financial Report|Legal Doc|Pitch Deck|Other"}

Subject: ${subject}
Filename: ${filename}` }]
    })
  });
  const d = await res.json();
  try {
    const text = d.content?.[0]?.text || '{}';
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : { company: 'Unknown', doc_type: 'Other' };
  } catch { return { company: 'Unknown', doc_type: 'Other' }; }
}

async function summarizeDoc(subject, filename, contentPreview) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-haiku-4-5', max_tokens: 300,
      messages: [{ role: 'user', content: `You are Drew, analyst at Promus Ventures. A new document arrived at newdeals@promusventures.com. Extract only the key investment details in 3-4 bullet points for Mike. Skip greetings, openers, and boilerplate. Focus only on: company, what they do, funding amount/stage, traction, and why it might be interesting for Promus.

Email subject: ${subject}
Filename: ${filename}
Content preview: ${contentPreview.substring(0, 500)}` }]
    })
  });
  const d = await res.json();
  return d.content?.[0]?.text || 'Could not summarize.';
}

async function sendTelegram(text) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT_ID, text: text.substring(0, 4000) }),
  }).catch(() => {});
}

async function main() {
  const state = loadState();
  console.log('Drew: Scanning for email attachments...');

  const token = await getToken();
  const messages = await getMessagesWithAttachments(token);
  
  let saved = 0;
  for (const msg of messages) {
    const msgId = msg.internetMessageId || msg.id;
    if (state.processed.includes(msgId)) continue;

    const attachments = await getAttachments(token, msg.id);
    if (!attachments.length) { state.processed.push(msgId); continue; }

    const subject = (msg.subject || 'Unknown').replace(/^(Fw|Re|FW):\s*/gi, '').trim();
    const from = msg.from?.emailAddress?.address || '';
    const date = (msg.receivedDateTime || '').substring(0, 10);

    for (const att of attachments.slice(0, 3)) { // Max 3 attachments per email
      if (!att.contentBytes) continue;

      const { company, doc_type } = await identifyCompanyAndType(subject, att.name || '');
      
      // Build clean filename
      const ext = path.extname(att.name || '.pdf') || '.pdf';
      const cleanName = `${company.replace(/[^a-zA-Z0-9 ]/g, '').trim()} - ${doc_type} - ${date}${ext}`;
      const savePath = path.join(DROPBOX_DIR, cleanName);

      // Save to Dropbox
      const buffer = Buffer.from(att.contentBytes, 'base64');
      fs.writeFileSync(savePath, buffer);
      console.log(`  ✅ Saved: ${cleanName} (${Math.round(buffer.length/1024)}KB)`);

      // Extract readable text from the file
      let textContent = '';
      try {
        const tmpPath = `/tmp/drew-${Date.now()}${ext}`;
        fs.writeFileSync(tmpPath, buffer);
        if (ext.toLowerCase() === '.pdf') {
          const { execSync } = require('child_process');
          textContent = execSync(`python3 -c "from pdfminer.high_level import extract_text; print(extract_text('${tmpPath}'))"`, { timeout: 15000 }).toString().substring(0, 3000);
        } else {
          textContent = buffer.toString('utf8', 0, 2000).replace(/[\x00-\x1f]/g, ' ').trim();
        }
        fs.unlinkSync(tmpPath);
      } catch(e) {
        textContent = subject; // fall back to subject line only
      }
      const summary = await summarizeDoc(subject, att.name, textContent);

      // Save summary to incoming_deals record
      try {
        const Database = require('better-sqlite3');
        const db = new Database('/Users/mini/.openclaw/workspace/mission-control/data/mission.db');
        // Find matching deal by company name or subject
        const deal = db.prepare("SELECT id FROM incoming_deals WHERE company_name LIKE ? OR deal_name LIKE ? LIMIT 1")
          .get('%' + company + '%', '%' + company + '%');
        if (deal) {
          const existing = db.prepare('SELECT research_summary FROM incoming_deals WHERE id = ?').get(deal.id);
          const newSummary = (existing?.research_summary ? existing.research_summary + '\n\n' : '') +
            `[Doc: ${att.name}]\n${summary}`;
          db.prepare("UPDATE incoming_deals SET research_summary = ?, researched = 1, updated = datetime('now') WHERE id = ?").run(newSummary.substring(0, 3000), deal.id);
        }
        // Also update companies DB
        const co = db.prepare('SELECT id FROM companies WHERE name LIKE ? COLLATE NOCASE LIMIT 1').get('%' + company + '%');
        if (co) {
          db.prepare("UPDATE companies SET drew_summary = ?, updated = datetime('now') WHERE id = ?").run(summary.substring(0, 1000), co.id);
        }
        db.close();
      } catch(e) { console.log('DB update error:', e.message); }

      // Notify Telegram
      await sendTelegram(
        `📎 Drew saved a doc to Dropbox\n\n` +
        `📁 ${cleanName}\n` +
        `📧 From: ${from}\n` +
        `📅 ${date}\n\n` +
        `${summary}\n\n` +
        `💾 Saved to: Dropbox/Promus/Incoming Docs/`
      );
      saved++;
    }

    state.processed.push(msgId);
    await new Promise(r => setTimeout(r, 2000)); // Rate limit between messages
  }

  saveState(state);
  console.log(`Drew: Done. Saved ${saved} attachments to Dropbox.`);
}

main().catch(e => { console.error('Drew Dropbox error:', e.message); process.exit(1); });
