'use strict';

/**
 * Drew – Promus VC Analyst Agent
 *
 * Dual-mode:
 *   require('./drew-analyst')  → exports async function(company, deal) → string
 *   node drew-analyst.js       → standalone cron: research new incoming deals & update DB
 */

const path = require('path');
const fs   = require('fs');

const DB_PATH = path.join(__dirname, 'data', 'mission.db');

// ── Helpers ───────────────────────────────────────────────────────────────────

function getApiKey() {
  // 1. Env var
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  // 2. OpenClaw auth-profiles (primary location)
  const home = process.env.HOME || '/Users/mini';
  const authProfilesPath = path.join(home, '.openclaw', 'agents', 'main', 'agent', 'auth-profiles.json');
  if (fs.existsSync(authProfilesPath)) {
    try {
      const profiles = JSON.parse(fs.readFileSync(authProfilesPath, 'utf8'));
      const key = profiles?.profiles?.['anthropic:default']?.key;
      if (key) return key;
    } catch {}
  }
  // 3. Legacy config paths
  const configPaths = [
    path.join(home, '.openclaw', 'config.json'),
    path.join(home, '.openclaw', 'workspace', 'state', 'config.json'),
  ];
  for (const p of configPaths) {
    if (fs.existsSync(p)) {
      try {
        const cfg = JSON.parse(fs.readFileSync(p, 'utf8'));
        const key = cfg.anthropicApiKey || cfg.ANTHROPIC_API_KEY || cfg.apiKey;
        if (key) return key;
      } catch {}
    }
  }
  throw new Error('ANTHROPIC_API_KEY not found in environment or config');
}

async function callClaude(systemPrompt, userPrompt) {
  const fetch = (await import('node-fetch')).default;
  const apiKey = getApiKey();

  const body = {
    model: 'claude-opus-4-5',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  };

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text || '';
}

// ── Core research function ────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are Drew, a sharp VC analyst at Promus Ventures — a seed-stage fund focused on the South / Heartland US.

Your job: given deal intake data, produce a concise one-page analyst brief for the partner reviewing this deal.

Format your response as structured markdown with these sections (use exactly these headers):

## Company Snapshot
2-3 sentences: what they do, stage, sector.

## Market & Opportunity
Size, tailwinds, why now.

## Team Signal
What the intake data tells us about the founders (if anything). Flag if unknown.

## Deal Terms
Round stage, amount raising, valuation/cap, key investors.

## Promus Fit
How well does this match Promus's thesis (seed, Heartland/South, B2B, fintech, health, SaaS)? Score: ✅ Strong / 🟡 Possible / ❌ Weak. 1-2 sentences of reasoning.

## Flags & Open Questions
Bullet list: what's missing, what needs diligence, any red flags.

## Suggested Next Step
One clear action: pass, take a call, request deck, etc.

Keep the whole brief under 400 words. Be direct — this is an internal document, not marketing copy.`;

/**
 * Research a deal and return a formatted markdown brief.
 * @param {string} company  Company name or research query
 * @param {object} deal     Optional deal record from DB
 * @returns {Promise<string>}
 */
async function drewAnalyst(company, deal = {}) {
  const context = [];

  context.push(`Company / Deal Name: ${deal.company_name || deal.company || company}`);
  if (deal.industry || deal.sector)   context.push(`Industry/Sector: ${deal.industry || deal.sector}`);
  if (deal.round_stage)               context.push(`Round Stage: ${deal.round_stage}`);
  if (deal.amount_raising)            context.push(`Amount Raising: ${deal.amount_raising}`);
  if (deal.valuation)                 context.push(`Valuation/Cap: ${deal.valuation}`);
  if (deal.city)                      context.push(`Location: ${deal.city}`);
  if (deal.investors)                 context.push(`Other Investors: ${deal.investors}`);
  if (deal.originated_by)             context.push(`Originated By: ${deal.originated_by}`);
  if (deal.inbound_type)              context.push(`Inbound Type: ${deal.inbound_type}`);
  if (deal.notes && deal.notes.length > 10) context.push(`Notes:\n${deal.notes.substring(0, 800)}`);
  if (deal.email_content && deal.email_content.length > 20) {
    context.push(`Email/Pitch Content:\n${deal.email_content.substring(0, 2000)}`);
  }

  const userPrompt = context.length > 1
    ? `Please research and analyze this deal:\n\n${context.join('\n')}`
    : `Please research and analyze: ${company}`;

  return callClaude(SYSTEM_PROMPT, userPrompt);
}

// ── Standalone cron mode ──────────────────────────────────────────────────────

async function runCron() {
  const Database = require('better-sqlite3');
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  // Find new incoming deals that haven't been researched yet
  const deals = db.prepare(`
    SELECT * FROM incoming_deals
    WHERE (researched = 0 OR researched IS NULL)
      AND (research_summary = '' OR research_summary IS NULL)
      AND status NOT IN ('archived', 'spam')
    ORDER BY intake_date DESC
    LIMIT 10
  `).all();

  if (deals.length === 0) {
    console.log('[Drew] No new deals to research.');
    db.close();
    return;
  }

  console.log(`[Drew] Researching ${deals.length} incoming deal(s)...`);

  const updateStmt = db.prepare(`
    UPDATE incoming_deals
    SET research_summary = ?,
        researched = 1,
        updated = datetime('now')
    WHERE id = ?
  `);

  let successCount = 0;
  for (const deal of deals) {
    const label = deal.company_name || deal.deal_name;
    try {
      console.log(`[Drew] → Researching: ${label}`);
      const summary = await drewAnalyst(label, deal);
      updateStmt.run(summary, deal.id);
      console.log(`[Drew] ✓ Done: ${label}`);
      successCount++;
    } catch (err) {
      console.error(`[Drew] ✗ Error on "${label}": ${err.message}`);
      // Mark as attempted so we don't loop forever on bad data
      updateStmt.run(`[Research error: ${err.message}]`, deal.id);
    }

    // Brief pause between calls to be kind to the API
    if (deals.indexOf(deal) < deals.length - 1) {
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  // Also research any pipeline deals missing a summary (e.g. promoted from incoming)
  const pipelineDeals = db.prepare(`
    SELECT * FROM promus_deals
    WHERE (research_summary = '' OR research_summary IS NULL)
      AND status NOT IN ('passed', 'archived')
    ORDER BY updated DESC
    LIMIT 5
  `).all();

  if (pipelineDeals.length > 0) {
    console.log(`[Drew] Also researching ${pipelineDeals.length} pipeline deal(s) missing summaries...`);
    const updatePipeline = db.prepare(`
      UPDATE promus_deals
      SET research_summary = ?,
          updated = datetime('now')
      WHERE id = ?
    `);

    for (const deal of pipelineDeals) {
      const label = deal.company;
      try {
        console.log(`[Drew] → Pipeline: ${label}`);
        const summary = await drewAnalyst(label, deal);
        updatePipeline.run(summary, deal.id);
        console.log(`[Drew] ✓ Done: ${label}`);
        successCount++;
      } catch (err) {
        console.error(`[Drew] ✗ Error on "${label}": ${err.message}`);
        updatePipeline.run(`[Research error: ${err.message}]`, deal.id);
      }

      if (pipelineDeals.indexOf(deal) < pipelineDeals.length - 1) {
        await new Promise(r => setTimeout(r, 1500));
      }
    }
  }

  db.close();
  console.log(`[Drew] Cron complete. ${successCount} deal(s) researched.`);
}

// ── Entry point ───────────────────────────────────────────────────────────────

if (require.main === module) {
  runCron().catch(err => {
    console.error('[Drew] Fatal error:', err.message);
    process.exit(1);
  });
}

module.exports = drewAnalyst;
