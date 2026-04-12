#!/usr/bin/env node
/**
 * sadie-calendar.js — Sadie, the Calendar Agent
 * Runs every morning at 7am CT. Scans Mike's Outlook calendar for the next 7 days,
 * logs companies/people, flags important meetings, sends prep note to Telegram.
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, '../deal-intake-outlook-config.json'), 'utf8'));
const db = new Database(path.join(__dirname, '../mission-control/data/mission.db'));
const BOT_TOKEN = '8395890971:AAHwb27dmD9SWCIfyvOToU5TXfMVAt-3aDo';
const CHAT_ID = '8345634392';
const ANTHROPIC_KEY = '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';

// Known portfolio companies for matching
const PORTFOLIO_KEYWORDS = [
  'whoop','halter','iceye','chef robotics','rhombus','bellabeat','flyr','statmuse','mapbox',
  'safehub','foundry lab','earth ai','arch systems','deako','biocogniv','swift navigation',
  'exploration company','tec','robco','mytra','recycleye','wakeo','encube','jua',
  'all.space','isotropic','lunar outpost','lunasonde','uplift360','samp','seerai',
  'ellipsis drive','capra','opencare','diligent robotics','ambition',
  'orbital ventures','orbital','promus'
];

async function getAppToken() {
  const res = await fetch(`https://login.microsoftonline.com/${cfg.tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: cfg.clientId, client_secret: cfg.clientSecret, scope: 'https://graph.microsoft.com/.default', grant_type: 'client_credentials' }),
  });
  const d = await res.json();
  if (!d.access_token) throw new Error('Token error: ' + JSON.stringify(d));
  return d.access_token;
}

async function getCalendarEvents(token) {
  const now = new Date().toISOString();
  const week = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const url = `https://graph.microsoft.com/v1.0/users/mike@promusventures.com/calendarView` +
    `?startDateTime=${now}&endDateTime=${week}&$top=50` +
    `&$select=subject,start,end,attendees,organizer,location,bodyPreview` +
    `&$orderby=start/dateTime`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  if (!res.ok) throw new Error('Calendar error: ' + JSON.stringify(data.error));
  return data.value || [];
}

function isPortfolioMeeting(subject) {
  const lower = subject.toLowerCase();
  return PORTFOLIO_KEYWORDS.some(k => lower.includes(k));
}

function formatEventTime(dateTimeStr) {
  const d = new Date(dateTimeStr);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' });
}

async function generatePrepNote(events) {
  const eventList = events.map(e => `- ${formatEventTime(e.start.dateTime || e.start.date)}: ${e.subject}`).join('\n');
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5', max_tokens: 600,
        messages: [{ role: 'user', content: `You are Sadie, calendar agent for Mike Collett at Promus Ventures. Review his upcoming meetings and write a brief daily prep note. Flag: board meetings, investor calls, LP meetings, founder meetings. Note any back-to-back conflicts. Be concise and actionable.

Upcoming 7 days:
${eventList}

Write a short prep briefing (3-8 bullet points max).` }]
      })
    });
    const d = await res.json();
    return d.content?.[0]?.text || '';
  } catch(e) { return ''; }
}

async function sendTelegram(text) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT_ID, text }),
  }).catch(() => {});
}

async function main() {
  const token = await getAppToken();
  const events = await getCalendarEvents(token);

  if (!events.length) {
    console.log('Sadie: No events in next 7 days.');
    return;
  }

  console.log(`Sadie: Found ${events.length} events`);

  // Flag portfolio/important meetings
  const portfolioMeetings = events.filter(e => isPortfolioMeeting(e.subject));
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/Chicago' });

  // Generate prep note
  const prepNote = await generatePrepNote(events);

  // Build event list for today + tomorrow
  const todayDate = new Date().toDateString();
  const tomorrowDate = new Date(Date.now() + 86400000).toDateString();

  const todayEvents = events.filter(e => new Date(e.start.dateTime || e.start.date).toDateString() === todayDate);
  const tomorrowEvents = events.filter(e => new Date(e.start.dateTime || e.start.date).toDateString() === tomorrowDate);

  let msg = `📅 Sadie's Calendar Brief — ${today}\n\n`;

  if (todayEvents.length) {
    msg += `**TODAY:**\n${todayEvents.map(e => `• ${formatEventTime(e.start.dateTime || e.start.date)} — ${e.subject}`).join('\n')}\n\n`;
  }

  if (tomorrowEvents.length) {
    msg += `**TOMORROW:**\n${tomorrowEvents.map(e => `• ${formatEventTime(e.start.dateTime || e.start.date)} — ${e.subject}`).join('\n')}\n\n`;
  }

  if (portfolioMeetings.length) {
    msg += `🏢 **PORTFOLIO MEETINGS THIS WEEK:**\n${portfolioMeetings.map(e => `• ${formatEventTime(e.start.dateTime || e.start.date)} — ${e.subject}`).join('\n')}\n\n`;
  }

  if (prepNote) {
    msg += `📋 **SADIE'S PREP NOTES:**\n${prepNote}`;
  }

  await sendTelegram(msg);
  console.log('Sadie: Briefing sent to Telegram');

  // Log portfolio meetings to Mission Control calendar
  for (const event of portfolioMeetings) {
    const existing = db.prepare("SELECT id FROM calendar_events WHERE title = ? AND scheduled = ?")
      .get(event.subject, event.start.dateTime?.substring(0, 16) || event.start.date);
    if (!existing) {
      const calRow = db.prepare("INSERT INTO calendar_events (title, description, event_type, scheduled, source) VALUES (?, ?, ?, ?, ?)")
        .run(event.subject, event.bodyPreview || '', 'meeting', event.start.dateTime?.substring(0, 16) || event.start.date, 'sadie');
      console.log('Sadie: Logged to MC:', event.subject);

      // Auto-link to company in central DB
      const titleLower = event.subject.toLowerCase();
      const allCos = db.prepare('SELECT id, name FROM companies').all();
      const matchedCo = allCos.find(c => titleLower.includes(c.name.toLowerCase().split(' ')[0]));
      if (matchedCo) {
        const date = (event.start.dateTime || event.start.date || '').substring(0, 10);
        const intExists = db.prepare('SELECT id FROM interactions WHERE source_id = ? AND company_id = ?').get(String(calRow.lastInsertRowid), matchedCo.id);
        if (!intExists) {
          db.prepare("INSERT INTO interactions (company_id, type, title, date, source, source_id) VALUES (?, ?, ?, ?, ?, ?)").run(
            matchedCo.id, 'meeting', event.subject, date, 'sadie', String(calRow.lastInsertRowid)
          );
          db.prepare("UPDATE companies SET last_touched = ?, updated = datetime('now') WHERE id = ?").run(date, matchedCo.id);
          console.log('Sadie: Linked to company:', matchedCo.name);
        }
      }
    }
  }

  db.close();
  console.log('Sadie: Done.');
}

main().catch(err => { console.error('Sadie error:', err.message); process.exit(1); });
