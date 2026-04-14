# HEARTBEAT.md — Periodic Checks

## Memory Write Rule (HIGHEST PRIORITY)
After any significant build or conversation (feature shipped, decision made, important context learned):
- Write to `memory/YYYY-MM-DD.md` immediately
- If MEMORY.md hasn't been updated in this session and something significant happened, update it
- Don't wait to be asked. Don't wait until end of session. Write it now.

## Periodic Checks (rotate, 2-4x per day)
- **Email** — any urgent unread at newdeals@promusventures.com or Mike's inbox?
- **Calendar** — upcoming events in next 24-48h?
- **Weather** — relevant if Mike might go out?
- **Agent health** — Hayley, Zach, Riley all running? Check logs if any look stale.

## State Tracking
State file: `memory/heartbeat-state.json`
Track last check timestamps for: email, calendar, weather, agents
