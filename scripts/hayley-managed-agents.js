#!/usr/bin/env node
/**
 * hayley-managed-agents.js — Hayley v2 on Claude Managed Agents
 * Uses pre-created agent + environment, correct events API format.
 * Agent: agent_011CZt6VVtv8YPucp57JH6Md
 * Environment: env_016qXEtYAvxxeNFdRAjE6Zyo
 */

const BOT_TOKEN = '8395890971:AAHwb27dmD9SWCIfyvOToU5TXfMVAt-3aDo';
const CHAT_ID = '8345634392';
const API_KEY = 'REDACTED_ANTHROPIC_API_KEY';
const AGENT_ID = 'agent_011CZt6VVtv8YPucp57JH6Md';
const ENV_ID = 'env_016qXEtYAvxxeNFdRAjE6Zyo';

const HEADERS = {
  'x-api-key': API_KEY,
  'anthropic-version': '2023-06-01',
  'anthropic-beta': 'managed-agents-2026-04-01',
  'Content-Type': 'application/json',
};

const PROMUS_COMPANIES = [
  'WHOOP wearable fitness tracker',
  'Halter USA virtual fencing livestock AgTech',
  'Bellabeat health wearables women',
  'ICEYE SAR satellite imagery Finland',
  'Rhombus Systems enterprise video security',
  'Chef Robotics AI food automation restaurant',
  'FLYR airline revenue management AI',
  'StatMuse sports data analytics',
  'MapBox mapping geospatial platform',
  'Safehub IoT seismic monitoring',
];

const ORBITAL_COMPANIES = [
  'The Exploration Company TEC spacecraft cargo',
  'RobCo industrial robotics automation Germany',
  'Mytra robotics warehouse automation',
  'Recycleye AI waste sorting robotics UK',
  'Wakeo supply chain visibility SaaS France',
];

async function apiPost(path, body) {
  const res = await fetch(`https://api.anthropic.com${path}`, {
    method: 'POST', headers: HEADERS, body: JSON.stringify(body)
  });
  return res.json();
}

async function apiGet(path) {
  const res = await fetch(`https://api.anthropic.com${path}`, {
    method: 'GET', headers: HEADERS
  });
  return res.json();
}

async function runSession(prompt) {
  // Create fresh session
  const session = await apiPost('/v1/sessions', { agent: AGENT_ID, environment_id: ENV_ID });
  if (!session.id) throw new Error('Session failed: ' + JSON.stringify(session));

  // Send user message
  await apiPost(`/v1/sessions/${session.id}/events?beta=true`, {
    events: [{ type: 'user.message', content: [{ type: 'text', text: prompt }] }]
  });

  // Poll until idle — collect ALL agent messages
  let allText = [];
  let done = false;
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const events = await apiGet(`/v1/sessions/${session.id}/events?beta=true&limit=100`);
    const data = events.data || [];

    // Check if session is done
    done = data.some(e => e.type === 'session.status_idle' || e.type === 'session.status_error');

    // Collect all agent message text blocks
    allText = [];
    for (const e of data) {
      if (e.type === 'agent.message') {
        for (const block of (e.content || [])) {
          if (block.type === 'text' && block.text) allText.push(block.text);
        }
      }
    }

    if (done) {
      process.stdout.write(' done\n');
      break;
    }
    process.stdout.write('.');
  }
  // Concatenate all agent messages into full briefing
  return allText.join('\n') || '';
}

async function sendTelegram(text) {
  for (let i = 0; i < text.length; i += 3800) {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, text: text.substring(i, i + 3800) }),
    }).catch(() => {});
    await new Promise(r => setTimeout(r, 500));
  }
}

async function main() {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    timeZone: 'America/Chicago'
  });
  console.log(`Hayley v2 (Managed Agents): ${today}`);
  const startTime = Date.now();

  // Research all companies in one session
  const prompt = `You are Hayley, portfolio news monitor for Promus Ventures. Today is ${today}.

Use web_search to research each of these portfolio companies and find the most important news from the last 30 days.

PROMUS VENTURES PORTFOLIO:
${PROMUS_COMPANIES.join('\n')}

ORBITAL VENTURES I PORTFOLIO:
${ORBITAL_COMPANIES.join('\n')}

For each company: search the web, then write 2-3 bullet points of key news. If nothing notable found, write "No significant news."

Format your response exactly as:
## 📰 Hayley's Portfolio Briefing — ${today}

### 🏢 PROMUS VENTURES
**WHOOP**
• ...

**Halter USA**
• ...

[continue for all Promus companies]

### 🛸 ORBITAL VENTURES I
**The Exploration Company**
• ...

[continue for all Orbital companies]

--- Hayley, News Monitor`;

  console.log('Running cloud research session...');
  const result = await runSession(prompt);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
  console.log(`\nCompleted in ${elapsed}s | ${result.length} chars`);

  if (result.length > 200) {
    console.log('\nPreview:\n', result.substring(0, 400));
    await sendTelegram(result);
    console.log('\n✅ Sent to Telegram');

    // Parse and save each company's news to the Companies DB
    try {
      const Database = require('/Users/mini/.openclaw/workspace/mission-control/node_modules/better-sqlite3');
      const db = new Database('/Users/mini/.openclaw/workspace/mission-control/data/mission.db');
      const today = new Date().toISOString().slice(0, 10);

      // Parse company sections from the briefing
      // Format: **Company Name**\n• bullets
      const companyBlocks = result.matchAll(/\*\*([^*]+)\*\*\n((?:[•\-][^\n]+\n?)+)/g);
      let saved = 0;
      for (const match of companyBlocks) {
        const name = match[1].trim();
        const summary = match[2].trim();
        if (name && summary && !summary.includes('PROMUS') && !summary.includes('ORBITAL')) {
          // Find company in DB by name (fuzzy)
          const co = db.prepare('SELECT id FROM companies WHERE name LIKE ? COLLATE NOCASE').get('%' + name.split(' ')[0] + '%');
          if (co) {
            db.prepare("UPDATE companies SET hayley_summary = ?, hayley_updated = ?, latest_news = ?, latest_news_date = ?, updated = datetime('now') WHERE id = ?").run(
              summary, today, summary.substring(0, 300), today, co.id
            );
            saved++;
          }
        }
      }
      console.log('\n✅ Saved', saved, 'company news summaries to DB');
      db.close();
    } catch(e) { console.log('DB save error:', e.message); }

  } else {
    console.log('⚠️ Short result:', result);
    await sendTelegram(`Hayley v2: completed in ${elapsed}s but result was short (${result.length} chars). May need longer polling.`);
  }
}

main().catch(async err => {
  console.error('Error:', err.message);
  await sendTelegram(`Hayley v2 error: ${err.message}`).catch(() => {});
  process.exit(1);
});
