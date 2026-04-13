# MEMORY.md — Alden's Long-Term Memory 🦉
_Lean essential context only. Detail lives in MEMORY_ARCHIVE.md._

## Who I'm Helping
- **Mike Collett** — runs Promus Ventures (early-stage deep tech VC: space, AI, robotics)
- Married 25 years to **Paige**. Four kids (Tad, Nat, Sam, Katherine).
- **Faith:** Christian. Jesus at the center.
- **Humor:** Dry, witty, sarcastic.
- **No swearing.** Hard rule.
- **Telegram** is primary channel. X: @mikecollett.

## Hard Rules (Non-Negotiable)
1. **Write memory at 50% context** — update daily log + MEMORY.md proactively, not when asked. Again at 70% if session continues. Never wait past 70%.
2. **NEVER take a destructive/irreversible action without explicit "go ahead"** — conversation about options is NOT permission. This means: session deletes, file wipes, git rewrites, service terminations, external sends.
2. **Git history rewrite = planned op only** — never autonomous, always Mike-approved.
3. **Session resets must summarize to MEMORY.md first.**
4. **NEVER touch streaming config (fixed 2026.4.11).**
5. **NEVER reinstall lossless-claw** — caused catastrophic failure Mar 21.
6. **Always test before sending** — links (`curl -I`), commands, features. Never present unverified work as done.

## Working Preferences
- Loves proactive work done without asking
- Loves task/todo tracking — keep Mission Control updated
- Wants status narration on long tasks — don't go silent
- **Link formatting:** Always clickable markdown `[text](url)` for mobile

## Active Systems (ports + passwords)
| System | Port | Public URL | Password |
|--------|------|-----------|----------|
| Mission Control | 3456 | https://mcs-mac-mini-1.tail145633.ts.net | PVOnward26! |
| PV Expenses | 3463 | https://mcs-mac-mini-1.tail145633.ts.net | PromusVC2026! |
| Second Brain | 3457 | — | — |
| Tad Golf | 3458 | https://aldenn-workspace.github.io/-tad-golf-2026/ | 0826 |
| Nat Golf | 3459 | https://aldenn-workspace.github.io/nat-golf-2026/ | 0826 |
| Whoop Tracker | 3461 | localhost:3461 | — |
| March Madness | 3464 | https://mcs-mac-mini-1.tail145633.ts.net:10000 | 0826 |

- **Mac mini:** Tailscale IP `100.90.77.113` (hostname: mcs-mac-mini-1)
- **OpenClaw:** v2026.4.11, Claude Sonnet 4.6 default, Homebrew Node
- **Morning Briefing:** 6am CT daily via Telegram

## Mission Control — Agent Team (all live as of Apr 11)
- **Alden** — Chief of Staff (me), Telegram
- **Finn** — Promus firm agent, Slack only (`~/finn/workspace/`). STRICT SEPARATION — never cross streams.
- **Drew** — Deals analyst + Dropbox doc saver (`drew-analyst.js`, `drew-dropbox.js`)
- **Zach** — Email agent, syncs `newdeals@promusventures.com` every 3h
- **Hayley** — Portfolio monitor Mon/Thu 7am CT. Agent ID: `agent_011CZt55CshCgVkvc1XvWpBp`
- **Sadie** — Calendar agent (`sadie-calendar.js` — needs build/verify)
- **Tate** — Legal doc review (`tate-legal.js`)
- **Riley** — Meeting scribe, Granola API every 2h (`riley.js`). Granola key: `grn_1CDS8DEwUbwEqVY1xp6NJvdp_K0qLqIr3QRIbwlz1wbTaWQxO0AVTqFyZT11nx4H5rHi0`

## Promus Ventures — Key Facts
- **Funds:** PVI (FMV $148.2M), PVII ($81.6M), PVIII ($22.9M), PVE ($10.2M), Orbital Ventures I ($154.4M USD / €132.2M) — **"Orbital Ventures S.C.A. SICAV-RAIF" = Promus in portfolio company legal docs**
- **Crown jewels:** WHOOP (~$147M total FMV across PVI+PVE+PVWhoop, $10.1B valuation), Halter USA (~$75M FMV across PVII+PVMHalter)
- **PV V fundraise:** $150M target, active. Team: Mike, John Lusk, Matt Martorello, Bill Merchantz, Stéphane Blanc (starts May 1). **Pierre Festal — GONE**, never include in team.
- **Affinity CRM** wired to Mission Control. 751 LPs in PV5 pipeline (list 192358).
- **Azure app** (`Alden Incoming Deals Reader`): Tenant `6db61128...`, Client `6da1a0c3...`. App-only auth, never expires. 50+ deals imported.

## Portfolio Info Tab (Built Apr 13, 2026)
- **Default landing page** of Mission Control
- **DB tables:** `portfolio_funds`, `portfolio_holdings`, `portfolio_subpositions`, `portfolio_exits`, `fx_rates`
- **Fund cards:** 8 vehicles — PVI, PVII, PVIII, PVE, PVMHalter (5 SPVs), PVWhoop (2 SPVs), PVMChef, OVI + PVRocketLab (exited)
- **Total FMV: ~$467M** across all vehicles (USD, OVI converted at EUR/USD daily rate)
- **SPV count: 9** (Halter 5 + Whoop 2 + Chef 1 + Rocket Lab 1 exited)
- **Features:** Sortable columns, expand/collapse per-round detail, MOIC per tranche, country flags, % of Fund column, EUR/USD badge (daily cron 7am CT, job: 3ca9aae8)
- **Company integration:** ↗ link on each row opens Company detail; Company detail shows purple Portfolio Position card (Cost, FMV, MOIC, funds, first date)
- **New 2026 SPVs added:** Halter Tranche 5 ($3.19M, 79,594 sh @ $40.14), Whoop Series G ($2.675M, 238,116 sh @ $11.234, Apr 1 2026)
- **OVI:** 20 companies, 55 subpositions from SOI draft (Dropbox). EUR→USD converted daily.
- **Pending:** Exits table (need PVI-PVE SOI spreadsheets), Port Cap Tables tab (Carta API), committed capital for PVI/PVIII/PVE (Mike to confirm), board decks storage, company board dates on calendar

## Integration Roadmap (Mike's vision, Apr 13)
- Exits table below active holdings
- Quarterly auto-update workflow
- Performance charts (FMV over time, MOIC waterfall)
- Carta API cap tables tab (start with WHOOP)
- Board decks storage + per-company doc viewer
- Portfolio company board dates → MC calendar + auto-reminders
- Team login views (John, Matt, Bill, Stéphane)
- Granola meeting notes → auto-filed to company record
- Funding round alerts per portfolio company
- WHOOP IPO / public comps tracking

## Current Priorities / Open Loops
- **Stéphane Blanc starts Apr 13** — PV Expenses access (cron fires 9am CT)
- **RHR experiment ends Apr 16** — Whoop Tracker Week 8 taper
- **Mac mini #2 arrives May 5** — full Promus/Finn infrastructure migrates there
- **Sadie calendar agent** — `sadie-calendar.js` missing, needs build
- **Git push to GitHub blocked** — secrets in older commits. Local-only for now. Do NOT rewrite history autonomously.
- **Lunar Outpost legal docs** — need full Section 4 of IRA + any side letters from Series A closing
- **Hayley news** — re-triggered Apr 13 8:40am; parser fixed; verify news shows in company pages

## Tate Legal Agent
- Fully built Apr 13. PDF extraction via pdfminer. Multi-doc Q&A via `/api/legal/ask`.
- Lunar Outpost docs: `/Users/mini/.openclaw/workspace/legal-docs/lunar-outpost/` (ira.pdf, rofr.pdf, voting.pdf, cert.pdf)
- Board protection confirmed: Orbital (=Promus) has Series Seed Director seat, removal requires Orbital consent (Section 1.6a, Voting Agreement). Threshold: ≥541,321 Series Seed shares.

## Knowledge Base (MC Notes Tab)
- 8 topic cards built. Reports system live. Ephesians study report saved (id=1, ~20K chars, full 6 chapters).

## Memory Backup
- **`~/memory-backup/`** — clean git repo, no secrets. Backs up every 30 min (LaunchAgent: `local.memory-backup`).
- Nightly mission checks MEMORY.md integrity first (step 0) — alerts Telegram if missing/wiped.

## Tad & Family
- **Tad** → Mount St. Mary's, August 2026, D1 golf
- **Nat** — also plays junior golf. Calendar: localhost:3459

## ⛔ DO NOT TOUCH
- **lossless-claw** — catastrophic failure Mar 21, never reinstall
- **Git history rewrite** — planned op only, Mike sign-off required
- **Streaming config** — permanently fixed 2026.4.11, leave it alone

_For full detail on any topic, read MEMORY_ARCHIVE.md_
