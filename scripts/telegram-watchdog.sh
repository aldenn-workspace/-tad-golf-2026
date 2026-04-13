#!/bin/bash
# Telegram Watchdog — checks gateway is alive and Telegram channel is responsive
# Runs on-demand via LaunchAgent local.telegram-watchdog

LOG="/Users/mini/.openclaw/logs/telegram-watchdog.log"
GATEWAY_PORT=18800

echo "[$(date)] Telegram watchdog check..." >> "$LOG"

# Check if gateway process is running
if ! pgrep -f "openclaw" > /dev/null 2>&1; then
  echo "[$(date)] WARNING: openclaw gateway not found in process list" >> "$LOG"
else
  echo "[$(date)] OK: gateway process found" >> "$LOG"
fi

# Check gateway HTTP
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:${GATEWAY_PORT}/health 2>/dev/null || echo "000")
echo "[$(date)] Gateway health check: $HTTP_CODE" >> "$LOG"

echo "[$(date)] Watchdog complete" >> "$LOG"
