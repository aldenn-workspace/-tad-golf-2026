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
1. **NEVER take a destructive/irreversible action without explicit "go ahead"** — conversation about options is NOT permission. This means: session deletes, file wipes, git rewrites, service terminations, external sends.
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
- **Funds:** PVI (FMV $148.9M), PVII ($81.6M), PVIII ($22.9M), PVE ($10.3M), Orbital Ventures I (€132.2M)
- **Crown jewels:** WHOOP (~$141M FMV, $10.1B valuation Apr 9), Halter USA (~$113M FMV)
- **PV V fundraise:** $150M target, active. Team: Mike, John Lusk, Matt Martorello, Bill Merchantz, Stéphane Blanc (starts May 1). **Pierre Festal — GONE**, never include in team.
- **Affinity CRM** wired to Mission Control. 751 LPs in PV5 pipeline (list 192358).
- **Azure app** (`Alden Incoming Deals Reader`): Tenant `6db61128...`, Client `6da1a0c3...`. App-only auth, never expires. 50+ deals imported.

## Current Priorities / Open Loops
- **Stéphane Blanc starts Apr 13** — PV Expenses access
- **RHR experiment ends Apr 16** — Whoop Tracker Week 8 taper
- **Mac mini #2 arrives May 5** — full Promus/Finn infrastructure migrates there
- **Sadie calendar agent** — `sadie-calendar.js` missing, needs build
- **Git push to GitHub blocked** — secrets in older commits. Local-only for now. Do NOT rewrite history autonomously.

## Memory Backup
- **`~/memory-backup/`** — clean git repo, no secrets. Backs up every 30 min (LaunchAgent: `local.memory-backup`).
- Nightly mission checks MEMORY.md integrity first (step 0) — alerts Telegram if missing/wiped.

## Tad & Family
- **Tad** → Mount St. Mary's, August 2026, D1 golf
- **Nat** — also plays junior golf. Calendar: localhost:3459

## ⚠️ Do Not Archive Orphan Session Transcripts
- The `.jsonl` files in `~/.openclaw/agents/main/sessions/` that `openclaw doctor` keeps failing to archive (EPERM errors) are **conversation history**
- On Apr 12, they were the only way to recover 4 days of lost context after MEMORY.md was wiped
- **Do not run `doctor --fix` to clean these up** — leave them alone
- If doctor ever successfully archives them as `.deleted` files, recovery from a future wipe becomes much harder

## ⛔ DO NOT TOUCH
- **lossless-claw** — catastrophic failure Mar 21, never reinstall
- **Git history rewrite** — planned op only, Mike sign-off required
- **Streaming config** — permanently fixed 2026.4.11, leave it alone

_For full detail on any topic, read MEMORY_ARCHIVE.md_
