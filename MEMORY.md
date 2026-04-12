# MEMORY.md — Alden's Long-Term Memory 🦉

## Mike Collett
- Runs **Promus Ventures** (promusventures.com) — early-stage deep tech VC (space, AI, robotics)
- Married 25 years to **Paige**. Four kids.
- **Faith:** Christian. Jesus at the center. Since childhood.
- **Humor:** Dry, witty, sarcastic. The world is meant to be enjoyed.
- **No swearing.** Hard rule.
- Email for Alden: aldenncos@gmail.com

## Social / Online
- **X (Twitter):** @mikecollett — logged into OpenClaw browser, X links now readable directly

## Remote Access
- **Tailscale** installed on Mac mini + iPhone. Current Mac mini IP: `100.90.77.113` (hostname: mcs-mac-mini-1). Old machine was `100.70.117.114` (offline). GitHub login: `aldenn-workspace@`
- **Termius** on iPhone for SSH terminal access (user: mini, port: 22)
- Tailscale account: `aldenn-workspace@` — GitHub login

## Cost Optimization Policy
- Default: deterministic code first, LLM only where ambiguity starts
- Morning Briefing: 1 LLM call max (data collected by scripts/morning_briefing_data.js)
- Security Audit: 0 LLM calls on clean days
- AM Sweep: 2 turns max
- Nightly Mission: uncapped (highest ROI)

## GitHub Publish Flow
- Always use web upload (Add file → Upload files) first
- Skip terminal/token path unless web upload fails

## Workspace Backup
- **Alden workspace on GitHub (private):** https://github.com/aldenn-workspace/alden-workspace
- Remote fixed Mar 12 (was incorrectly pointing to tad-golf repo)
- Excludes: auth tokens, DB files, node_modules, binary assets
- Commit regularly after significant changes

## Systems
- **Second Brain:** `/second-brain/` — 8 folders. Mike texts me stuff, I file it. UI at `index.html` on port 3457 (LaunchAgent).
- **Tad Golf Calendar:** `/tad-golf/` — Tad's 2026 junior golf schedule. Port 3458 (LaunchAgent). Live on GitHub Pages: https://aldenn-workspace.github.io/-tad-golf-2026/ (password: 0826).
- **Nat Golf Calendar:** `/nat-golf/` — Nat Collett's 2026 junior golf schedule. Port 3459 (LaunchAgent). 5 tournaments (Jun–Jul 2026). Live on GitHub Pages: https://aldenn-workspace.github.io/nat-golf-2026/ (password: 0826).
- **March Madness (NCAA Eliminator):** `/march-madness/` — Port 3464 (LaunchAgent). Live on Tailscale Funnel: https://mcs-mac-mini-1.tail145633.ts.net:10000/index.html?pwd=0826 (password: 0826). Vue.js bracket app with bracket tracking. Auto-updates bracket scores from ESPN every 15 minutes (Mar/Apr, cron job). Scripts: `bracket-auto-update.js` (ESPN), `score-watcher.js` (CBS), `update-scores.js` (manual).
- **PV Expenses:** `/pv-expenses/` — Port 3463 (LaunchAgent). Multi-user expense tracker for Promus team. Public URL (no VPN): **https://mcs-mac-mini-1.tail145633.ts.net** (Tailscale Funnel, no port in URL). Password: PromusVC2026!. Users: Mike Collett (admin), John Lusk, Matt Martorello, Bill Merchantz, Stéphane Blanc (starts April 13, 2026). Features: CSV import, AI receipt scanning (Claude vision, ≥$75 threshold, camera on iPhone), reports/approvals, Excel export, PWA (Promus logo icon, installable on iPhone home screen). Receipt workflow: open PWA → tap + → camera button in form → photo from camera or library → Claude auto-fills vendor/date/amount → pick fund/category → save. ~30 seconds on the road.
- **Mission Control:** `/mission-control/` — Port 3456 (LaunchAgent). Tasks board, Calendar, Memory Viewer, Overview, Cron Health, Agents pages. 8 themes. Phase 4 shipped Mar 13 2026: Promus deal pipeline Kanban (🚀 Pipeline nav, 6 stages: Sourcing→First Look→Diligence→IC→Passed/Closed), deal cards with sector/lead/check size/notes, full CRUD modal, 5 seed deals, weighted pipeline stat. Team page live. sector+lead columns added to promus_deals. **Public via Tailscale Funnel (Mar 29 — FIXED):** https://mcs-mac-mini-1.tail145633.ts.net (password: PVOnward26!). Cookie persists 7 days. All APIs working: 17 tasks, 7 events, 5 deals, 41 memory files, 5 crons, 75/100 security score.
- **Morning Briefing:** Daily at 6am CT via Telegram. Uses web_fetch + Brave Search for LP research. Fixed Feb 19 (was hanging on browser dependency).
- **Brave Search:** Configured. Key in gateway LaunchAgent plist as BRAVE_API_KEY.
- **Telegram:** Primary messaging channel.
- **OpenClaw:** Running 2026.2.17, Claude Sonnet 4.6 default (switched back from OpenAI Codex Mar 8 — Mike preferred Claude quality), Homebrew Node, OpenAI embeddings active.

## Mike's Working Preferences (confirmed Feb 19, reinforced Mar 27)
- Loves proactive work done without being asked
- Loves task/todo tracking — keep Mission Control updated
- **Biggest pet peeve: solutions that don't work. ALWAYS TEST BEFORE SENDING.**
  - Links: curl/verify they work before giving them to Mike
  - Commands: test locally first, never untested
  - Features: verify working before marking as done
  - "Never present unverified work as done"
- Wants status narration when working on something long — don't go silent
- **Link formatting:** Always clickable markdown `[text](url)` for mobile
- Do not send incorrect things that can easily be tested

## Tad Collett (Mike's son)
- Heading to **Mount St. Mary's** in August 2026 for D1 golf
- Sibling "NAT" also plays junior golf
- Golf calendar at http://localhost:3458
- Next action: Northern Jr signup **Mar 1 @ 7am CT** at northernjunior.com/qualifier/

## Whoop API
- App registered: Client ID `87722d0b-84a6-42bb-acbc-287ad1ec63a3`
- Tokens: `/Users/mini/.openclaw/workspace/whoop-auth/tokens.json` (auto-refreshes)
- Endpoint base: `https://api.prod.whoop.com/developer/v2/`
- Workout endpoint: `/developer/v2/activity/workout/` (not /v2/workout/)
- Zone data: `zone_durations` (plural) — zones 2-5 give real Z2+ minutes
- OAuth tip: **must use incognito window** — regular browser loops on login

## RHR 60→55 Experiment Tracker
- **Goal:** Get RHR from 60 → 55 bpm over 8 weeks
- **Dashboard:** http://localhost:3461 (LaunchAgent: `local.whoop-tracker`)
- **Files:** `/Users/mini/.openclaw/workspace/whoop-tracker/`
- **Dates:** Feb 20 – Apr 16, 2026 (Fri–Thu weeks)
- **Week 4:** DELOAD · **Week 8:** TAPER
- Tracks: actual Zone 2+ minutes (zone_durations), HIIT, strain, recovery, RHR
- Privacy policy live: https://aldenn-workspace.github.io/privacy-policy/

## Mission Statement
- “An autonomous organization of AI agents that does work for me and produces value 24/7”

## Promus Ventures — Fund & Portfolio Structure
_Confirmed by Mike, March 11 2026. Source: MC Q4 2025 Combined SOI V2 Draft._

### Funds (5)
- **PVI** — Promus Ventures I (tab: PV I SOI) | Cost $7.9M | FMV $148.9M
- **PVII** — Promus Ventures II (tab: PV II SOI) | Cost $5.7M | FMV $81.6M
- **PVIII** — Promus Ventures III (tab: PV III SOI) | Cost $10M | FMV $22.9M
- **PVE** — PV Expansion Fund I (tab: PV E SOI) | Cost $3.6M | FMV $10.3M
- **Orbital Ventures I** — Separate European fund (Luxembourg SICAV-RAIF). Mike is GP alongside Pierre & John. Post-investment period. FMV €132.2M, MOIC 1.6x, Net IRR 9.8%.

### SPVs (3 vehicles)
- **PV Whoop** — 2 SPVs (tab: PV Whoop SOI) | Cost $1.4M | FMV $8.6M
- **PVM Halter** — 5 SPVs (tab: PVM Halter SOI) | Cost $10M | FMV $39.9M
- **PVM Chef** — 1 SPV (tab: PVM Chef SOI) | Cost $850K | FMV $850K

### Crown Jewels
- **WHOOP** (~$141M total FMV): PVI Seed/A/B/D/E + PVE C/E + PV Whoop SPV. Invested since Seed. Marked to Series G.
- **Halter USA** (~$113M total FMV): PVII A/A-1/B2/B1 + PVM Halter 5 tranches (B2→D). AgTech/virtual fencing (NZ).

### Other Key Holdings
- **ICEYE** (~$12M): PVII + PVIII. SAR satellite imagery. Finland.
- **Bellabeat** ($15.3M): PVI only. Health wearables.
- **Rhombus Systems** (~$7.4M): PVII + PVIII. Enterprise video security.
- **Chef Robotics** (~$4M): PVIII + PVM Chef SPV. AI food assembly robots.
- **FLYR** ($2.1M): PVE. Airline revenue AI.
- **MapBox** (~$2.7M): PVI + PVE. Mapping/geo platform.

### Promus Ventures V — Active Fundraise (Feb 2026)
- **PV V** is the current fund being raised. Deck: `FINAL-Promus-Ventures-V-Feb-2026-deck.pptx`
- **Focus:** Early-stage DeepTech — AI/Robotics/Space/Manufacturing
- **Team:** Mike Collett (Founder/MP), John Lusk (Partner), Matt Martorello (Venture Partner), Bill Merchantz (Venture Partner), Stéphane Blanc (Partner, starts May 1 2026)
- **Pierre Festal — GONE.** No longer with Promus. Do not include him in team lists, bios, or pitches. Historical references in Orbital Ventures I context only.
- **Track record headline:** 6 unicorns, $72B+ portfolio EV, $235M committed across 5 funds + 6 SPVs
- **Top MOICs:** Kensho 47.9x (deck says 82x — deck is WRONG, confirmed by Mike), WHOOP 48x, Halter 32x**, Rocket Lab 20x, RobCo 7x
- **Slide 6 returns (Q4 2025, nonaudited):** PVI 4.3x Net TVPI | PVII 9.0x | PVIII 1.6x | PVE 1.1x | OV I 1.4x | PV Halter I 12.4x | PV Halter II 10.5x | PV Whoop I 4.6x
- **PV V terms:** $150M target, 2% mgmt fee, 20% carry, 1% GP commit, Delaware, Seed/A entry, $2–4.5M initial check, 15 companies target
- **Offices:** Chicago, San Francisco, Luxembourg

### Finn Knowledge Base
- Full portfolio: `/Users/mini/finn/workspace/knowledge/promus-portfolio.md`
- Orbital Ventures I detail: `/Users/mini/finn/workspace/knowledge/orbital-ventures-i.md`
- Fund structure overview: `/Users/mini/finn/workspace/knowledge/portfolio-overview.md`
- PV V fundraise deck summary: `/Users/mini/finn/workspace/knowledge/promus-v-fundraise.md`
- **Quarterly workflow:** Mike shares updated SOI spreadsheets each quarter → pull fund returns (Net TVPI, IRR, DPI, MOIC) for Slide 6 of deck (most important slide) + update portfolio FMVs

## ⛔ DO NOT TOUCH — lossless-claw
- lossless-claw context engine (`@martian-engineering/lossless-claw`) was installed Mar 21 2026
- It caused a catastrophic failure — lost all conversation, 6 hours of recovery work
- **NEVER reinstall, restore, or enable lossless-claw under any circumstances**
- Current context engine: `legacy` — leave it alone

## Recent Events (Apr 8–12, 2026)
- **Riley (Meeting Scribe)** — Deferred. Granola set up (key: `grn_1CDS8DEwUbwEqVY1xp6NJvdp_K0qLqIr3QRIbwlz1wbTaWQxO0AVTqFyZT11nx4H5rHi0`), 0 notes yet. Next meetings: Capra Robotics (Apr 9), Lunar Outpost board (Apr 10). Build deferred until Granola has content.
- **WHOOP raised $575M at $10.1B valuation** (Apr 9) — significant for Promus portfolio (PVI/PVE heavily invested)
- **Hayley (portfolio monitor)** is live: Mon + Thu 7am CT, Claude Managed Agents. Config: `scripts/hayley-agent-config.yaml`
- **Mission Control** had major incident Apr 12: source files went missing, subagents rebuilt routes. Now recovered and running.
- **Drew (Dropbox Doc Saver)** — Cron running, saving deal emails from newdeals@ to `~/Dropbox/Promus/Incoming Docs/`. Apr 12 run saved 24 files for 11 companies (House of Fallon, Tervizio, HD Robotics, Ginolis, AYRYX, ZELP, Findora, OPUM, Strix Aero, Aadi Space, Stargate). State file issue fixed.
- **Stéphane Blanc starts April 13** — PV Expenses access should be ready
- **RHR experiment ends April 16** — Whoop Tracker wrapping up Week 8
- **Mac mini #2 expected May 5** — Finn migration target
- **MEMORY.md was wiped** sometime Apr 8–12; restored from git backup Apr 12

## Unfinished Business
- **Finn** — Promus firm agent (chosen Mar 11 2026). Deployed as second OpenClaw agent (agents.list). Workspace: ~/finn/workspace/. Channel: **Slack only** (Socket Mode, bound via `openclaw agents bind --agent finn --bind slack`). Status: LIVE. Stays on Mac mini #1 (this machine) until Mac mini #2 arrives **May 5, 2026** (updated Mar 26). Git push method: /tmp/tad-golf-fix/ and /tmp/nat-golf-fix/ clean repos using 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.
- **STRICT SEPARATION:** Alden = Telegram + personal workspace. Finn = Slack + Promus workspace. Never cross streams. After any reinstall/reset, MUST run `openclaw agents bind --agent finn --bind slack` to restore routing.
- Morning briefing email: needs SMTP setup (Gmail app password for aldenncos@gmail.com or Mail.app auth)
- Learn Promus Ventures portfolio
- BOOTSTRAP.md needs deleting after setup is fully complete
- GitHub PAT with repo scope: stored securely (not in memory files). aldenn-push token, created Mar 10 2026.

## Operational Knowledge Hub (Mar 28 2026)

**Full system runbooks:** See `SYSTEM_RUNBOOKS.md` for detailed operational manual covering:
- March Madness bracket (ESPN data sources, round naming conventions, common breakage)
- Promus Expenses (Tailscale routing, password, receipt workflow)
- Morning Briefing (data collection script, WHOOP OAuth, cost optimization)
- Mission Control (API routes, live health checks, database schema)
- Second Brain (knowledge structure, auto-saved briefings)
- Tad/Nat Golf calendars (shared tournaments, GitHub Pages)
- Whoop Tracker (OAuth, zone data, RHR experiment)
- Nightly Mission (3-priority sweep: security scan, health check, hygiene)
- Alert Watcher (out-of-band Telegram alerting, no suppression possible)
- Finn Agent (Slack binding, Event Subscriptions still pending in Slack app dashboard)

**Key Recovery Lessons (from Mar 27-28 reinstall):**
- Every public-facing system must be in MEMORY.md with port, password, URL, data sources
- Always test links before sending: `curl -I <url>`
- Always verify task completion with concrete evidence (not "I ran it")
- Never guess at data structures — always verify against actual schema
- Document data sources: endpoints, auth method, rate limits, fallback behavior

**Critical Rule (learned hard way):**
- Test links, commands, and features before sending/marking done
- Verification is not optional — it's the difference between "working" and "you wasted my time"

## Verification Harness (Active Mar 30 2026)

**Framework to prevent lazy verification, planning deviations, and entropy accumulation.**
(See HARNESS.md for full framework + SUBAGENT_ROLES.md for detailed roles)

**Non-negotiable rules:**
1. No untested work gets sent to you. Period.
2. If I can't verify it works, I haven't finished it.
3. Entropy cleanup happens before "done" is declared.
4. Band-aids get labeled as such; no false advertising.
5. All plan deviations must be justified in writing.

**Sub-agents (spawned on-demand):**
- **Context Verifier** — reads all related files, finds contradictions, creates Algorithmic Contract
- **Task Decomposer** — breaks overwhelming tasks into <100-line pieces
- **Quality Inspector** — independent verification before task closure (non-negotiable)
- **Entropy Auditor** — cleanup after each session (removes dead code, fixes docs)
- **Plan Deviation Auditor** — enforces planning stickiness (justifies all deviations)

**How it works:**
- Pre-task: Context Verifier creates "definition of done" (Algorithmic Contract)
- During task: I work the plan, notify if deviating
- Post-task: Quality Inspector signs off (or rejects with evidence)
- Entropy Auditor cleans up files touched
- I don't declare "done" until Quality Inspector approves

---

## March 2026 Harness Audit — Key Findings

**Date:** April 1, 2026 (2:00 AM CT)

**Critical Finding:** Sub-agents framework exists but was never used. All rule violations would have been caught by Quality Inspector.

### What Broke in March

| Failure | Count | Would QI Catch? |
|---------|-------|-----------------|
| Untested links sent to Mike | 6 | ✅ YES (100% catch rate) |
| Untested forms delivered | 3 | ✅ YES (100% catch rate) |
| Infrastructure not load-tested | 2 | ✅ YES (100% catch rate) |
| Data validation gaps | 2 | ✅ YES (100% catch rate) |
| **Total preventable via QI** | **13/13** | — |

### Harness Health (March 2026)

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Rule violations | 3 | 0 | ⚠️ |
| Quality Inspector spawned | 0/12 | 100% | ❌ CRITICAL |
| Sub-agents spawned | 0/5 | per-task | ❌ CRITICAL |
| Promise-vs-reality match | 62% | 95%+ | ⚠️ |
| System coherence | 65/100 | 90+ | ⚠️ |

### April 2026 Corrective Actions

1. **Enforce Quality Inspector** — Make spawning mandatory for all public-facing work
2. **Add Pre-Send Checklist** — Test all links with `curl -I` before sending
3. **Document-First Workflow** — Reorder: Build → Document → Test → Verify → Clean
4. **24-Hour Stability Rule** — Infrastructure work must be load-tested before "done"
5. **Log Sub-Agent Usage** — Track spawning in TELEMETRY.md (target: 100% of public tasks)

### Standing Rule for April

**Quality Inspector is not optional.** Any task that sends a link, delivers a feature, or modifies user data MUST be inspected and approved before I declare it done. Period.

