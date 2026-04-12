#!/bin/bash
# Monthly digest trigger for PV Expenses
# Schedule: 1st of each month at 8am CT
# Add to cron: 0 8 1 * * /Users/mini/.openclaw/workspace/pv-expenses/scripts/monthly-digest.sh

ENDPOINT="http://127.0.0.1:3463/api/digest/send"
SESSION_COOKIE="${PV_EXPENSES_SESSION:-}"  # Set this env var if needed

echo "$(date): Triggering monthly digest..."
curl -s -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -b "connect.sid=$SESSION_COOKIE" \
  && echo "Digest sent OK" || echo "Digest failed"
