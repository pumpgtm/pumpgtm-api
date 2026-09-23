#!/usr/bin/env sh
# Usage: PUMPGTM_KEY=eve_mcp_... sh examples/curl.sh
set -eu
B=https://app.pumpgtm.com
H="Authorization: Bearer $PUMPGTM_KEY"

echo "# This week's funnel and per-account pacing"
curl -s "$B/api/v1/progress?sinceDays=7" -H "$H"

echo; echo "# Connection requests sent in the last 7 days"
curl -s "$B/api/v1/activity?action=invite&outcome=ok&sinceDays=7&limit=1" -H "$H"

echo; echo "# Replies waiting for a decision"
curl -s "$B/api/v1/replies?limit=5" -H "$H"
