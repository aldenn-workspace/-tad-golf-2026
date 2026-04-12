# MEMORY_ARCHIVE.md — Historical Detail
_Load on demand when you need deep context. Not injected every session._

## Remote Access Detail
- Tailscale account: `aldenn-workspace@` — GitHub login
- Termius on iPhone for SSH (user: mini, port: 22)
- Old machine: `100.70.117.114` (offline)
- GitHub workspace (private): https://github.com/aldenn-workspace/alden-workspace (push currently blocked by secrets in history)
- aldenn-push PAT stored securely (not in memory files), created Mar 10 2026

## Cost Optimization Policy
- Default: deterministic code first, LLM only where ambiguity starts
- Morning Briefing: 1 LLM call max (data collected by scripts/morning_briefing_data.js)
- Security Audit: 0 LLM calls on clean days
- AM Sweep: 2 turns max
- Nightly Mission: uncapped (highest ROI)
- Compaction model: Haiku (set in openclaw.json, reserveTokens: 50000)

## Systems Detail

### Mission Control
- `/mission-control/` — Port 3456, DB: `mission-control/data/mission.db`
- Source backed up to GitHub branch `mission-control-backup`
- Full nav: Overview, Tasks, Calendar, Pipeline, Incoming Deals, PV5 Fundraise, Companies, People, Team, Legal Check, Research, Trips, Podcasts, Articles, Memory, Notes, Knowledge Base, Cron Health, Security
- Cookie persists 7 days, auto-refresh every 30 sec

### PV Expenses
- `/pv-expenses/` — Port 3463. Users: Mike (admin), John Lusk, Matt Martorello, Bill Merchantz, Stéphane Blanc
- Features: CSV import, AI receipt scanning (Claude vision ≥$75), reports/approvals, Excel export, PWA
- Receipt workflow: open PWA → tap + → camera → Claude auto-fills → pick fund/category → save (~30 sec)

### Second Brain
- `/second-brain/` — 8 folders. Mike texts stuff, I file it. Port 3457.

### Whoop Tracker / API
- App Client ID: `87722d0b-84a6-42bb-acbc-287ad1ec63a3`
- Tokens: `/Users/mini/.openclaw/workspace/whoop-auth/tokens.json` (auto-refreshes)
- Endpoint base: `https://api.prod.whoop.com/developer/v2/`
- Workout endpoint: `/developer/v2/activity/workout/`
- Zone data: `zone_durations` (plural) — zones 2-5 give real Z2+ minutes
- OAuth tip: must use incognito window
- RHR experiment: Feb 20 – Apr 16, 2026. Goal: 60→55 bpm. Week 4: DELOAD, Week 8: TAPER.

### March Madness
- `/march-madness/` — Port 3464. Vue.js bracket tracker. Scripts: `bracket-auto-update.js` (ESPN), `score-watcher.js` (CBS), `update-scores.js` (manual).

### Tad/Nat Golf
- Tad: `/tad-golf/` port 3458, GitHub Pages: https://aldenn-workspace.github.io/-tad-golf-2026/
- Nat: `/nat-golf/` port 3459, GitHub Pages: https://aldenn-workspace.github.io/nat-golf-2026/

### Finn Agent
- Workspace: `~/finn/workspace/`
- Channel: Slack only (Socket Mode). After any reinstall: `openclaw agents bind --agent finn --bind slack`
- Stays on Mac mini #1 until Mac mini #2 arrives May 5
- Knowledge base: `~/finn/workspace/knowledge/`

### Azure / Outlook Integration
- Tenant ID: `6db61128-12b4-4d09-b0d2-0e22fc61e1b1`
- Client ID: `6da1a0c3-860a-42cb-92e9-3608c15dd4bb`
- Config: `deal-intake-outlook-config.json`
- `@azure/msal-node` installed in workspace
- App-only auth (no expiry). Reads `newdeals@promusventures.com` from Jan 1 2026 onward.

### last30days Skill
- Installed at `~/.openclaw/skills/last30days/`
- 5 sources: Reddit+comments (ScrapeCreators), X (xAI), YouTube (yt-dlp), HN, Polymarket
- Cookie scanner permanently disabled (was causing macOS permission prompts)
- ScrapeCreators API key: 100 free credits

## Promus Ventures — Full Portfolio Structure
_Source: MC Q4 2025 Combined SOI V2 Draft, confirmed Mar 11 2026_

### Funds
- **PVI** — Cost $7.9M | FMV $148.9M
- **PVII** — Cost $5.7M | FMV $81.6M
- **PVIII** — Cost $10M | FMV $22.9M
- **PVE** — Cost $3.6M | FMV $10.3M
- **Orbital Ventures I** — Luxembourg SICAV-RAIF. FMV €132.2M, MOIC 1.6x, Net IRR 9.8%. Mike is GP alongside Pierre (historical) & John.

### SPVs
- **PV Whoop** — 2 SPVs | Cost $1.4M | FMV $8.6M
- **PVM Halter** — 5 SPVs | Cost $10M | FMV $39.9M
- **PVM Chef** — 1 SPV | Cost $850K | FMV $850K

### Crown Jewels
- **WHOOP** (~$141M FMV): PVI Seed/A/B/D/E + PVE C/E + PV Whoop SPV. Raised $575M at $10.1B (Apr 9 2026).
- **Halter USA** (~$113M FMV): PVII A/A-1/B2/B1 + PVM Halter 5 tranches. AgTech/virtual fencing (NZ).

### Other Key Holdings
- ICEYE (~$12M): SAR satellite imagery. Finland.
- Bellabeat ($15.3M): Health wearables.
- Rhombus Systems (~$7.4M): Enterprise video security.
- Chef Robotics (~$4M): AI food assembly robots.
- FLYR ($2.1M): Airline revenue AI.
- MapBox (~$2.7M): Mapping/geo platform.

### PV V Fundraise Detail
- Deck: `FINAL-Promus-Ventures-V-Feb-2026-deck.pptx`
- $150M target, 2% mgmt fee, 20% carry, 1% GP commit, Delaware, Seed/A entry, $2–4.5M check, 15 companies
- Offices: Chicago, San Francisco, Luxembourg
- Track record: 6 unicorns, $72B+ portfolio EV, $235M committed
- Top MOICs: Kensho 47.9x (deck says 82x — WRONG), WHOOP 48x, Halter 32x, Rocket Lab 20x, RobCo 7x
- Slide 6 returns (Q4 2025): PVI 4.3x | PVII 9.0x | PVIII 1.6x | PVE 1.1x | OV I 1.4x | PV Halter I 12.4x | PV Halter II 10.5x | PV Whoop I 4.6x
- 751 LPs in Affinity pipeline (list 192358). 277 LPs: Mike added as co-owner.

### Finn Knowledge Base
- Full portfolio: `/Users/mini/finn/workspace/knowledge/promus-portfolio.md`
- Orbital Ventures I: `/Users/mini/finn/workspace/knowledge/orbital-ventures-i.md`
- Fund structure: `/Users/mini/finn/workspace/knowledge/portfolio-overview.md`
- PV V deck summary: `/Users/mini/finn/workspace/knowledge/promus-v-fundraise.md`

## Recent Events (Apr 6–12, 2026)

### Apr 6 — Major Build Day
- AI routing policy built: `AI_ROUTING.md`, `CHIEF_OF_STAFF_PLATFORM.md`
- Mission Control: Incoming Deals page, Alden Guide nav page, My Todos redesign, removed PV Todos/ROI nav
- Scripts built: `evening_task_sweep.js`, `meeting_prep.js`, `meeting_followthrough.js`, `kaizen_weekly_review.js`, `daily_memory_capture.js`
- Stakeholder files: `relationships/john-lusk.md`, `relationships/pete-beck.md`, `relationships/adrian-link-letters.md`
- Mission Control login cookie bug fixed (`secure:true` broke localhost auth)
- Browser plugin enabled (Chrome, port 18800, profile: openclaw) — X links now readable
- Azure app set up for Outlook read-only. App-only auth working.
- OpenClaw updated to 2026.4.5. Model switched to Claude Sonnet 4.6.
- Gateway entrypoint mismatch fixed.
- Incoming Deal Flow fully built: 50+ deals, Claude extraction, dedup, filters, stats bar.
- Agent team named: Alden, Drew, Zach, Hayley, Sadie, Tate, Riley
- Affinity CRM wired. Companies/People DB seeded (227 companies, 115+ interactions).
- Mission Control nav: Incoming Deals, Pipeline, PV5, Companies, People, Legal, Research, Trips, Notes, Knowledge Base, Team
- Trips tab: Cinque Terre (May 28–Jun 1) pre-loaded
- Apple Notes tab: SQLite index synced nightly 2:30am
- Orbital Ventures Invoice Template (.docx + .html) created
- Podcasts tab dates fixed

### Apr 7–9
- Morning briefing delivery regression fixed
- OpenClaw updated: 4.1 → 4.11
- plugins.allow whitelist removed permanently (was breaking Telegram)
- Heartbeat reduced to every 4 hours
- Daily session reset at 2am CT configured
- Finn model set to Sonnet. Agent crons switched to Haiku.
- Hayley v2 on Claude Managed Agents (~2 min vs 20 min)
- Riley activated after Capra Robotics meeting (Apr 9). All 7 agents live.

### Apr 11 afternoon
- PV5 Fundraise Kanban built: 751 LPs, 18 stages, Affinity sync
- 277 LPs updated — Mike added as co-owner
- Drew auto-triggered on deal promotion to Pipeline
- Dropbox doc saver wired: saves pitch decks to `~/Dropbox/Promus/Incoming Docs/`

### Apr 12 — Rough Day
- **Git incident:** `git pull --rebase` in workspace root deleted source files. DB survived.
- **Recovery cost: ~$500 in API calls.** Worst single-day cost.
- **MEMORY.md wiped** — restored from git history.
- **Session delete incident:** Alden deleted session unilaterally when Mike asked about costs. Hard rule added to AGENTS.md.
- All 4 safeguards implemented: nightly integrity check, separate memory backup repo, 30-min backup, compaction config.
- MEMORY.md split into lean + archive (this file).

## Key Relationships
- **Pete Beck** — high-context, active: new deal, Auckland meeting/timing
- **John Lusk** — Partner at Promus
- **Stéphane Blanc** — Partner, starts May 1 (PV Expenses access Apr 13)
- **Adrian (Link Letters)** — recurring relationship
- **Claude-Sébastien LERBOURG** — last meeting Apr 9 (Capra Robotics, chairman Joni)

## Operational Runbooks
Full runbooks in `SYSTEM_RUNBOOKS.md`:
- March Madness, PV Expenses, Morning Briefing, Mission Control, Second Brain, Tad/Nat Golf, Whoop Tracker, Nightly Mission, Alert Watcher, Finn Agent

## Verification Harness
Framework in `HARNESS.md` + `SUBAGENT_ROLES.md`. Key rule: Quality Inspector is not optional for any public-facing work.

Mar 2026 audit: 13/13 failures preventable by QI. QI was spawned 0/12 times. Fix in April: mandatory spawning.
