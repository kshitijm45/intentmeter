#!/usr/bin/env bash
# Wrapper script for the cron job.
# Activates the virtualenv and runs update_db.py from the correct directory.
#
# To install the cron job (daily at 3 AM):
#   crontab -e
#   Add the line:
#   0 3 * * * /Users/kshitij/Projects/intentmeter/backend/scripts/update.sh
#
# Or run manually:
#   ./backend/scripts/update.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$BACKEND_DIR/logs/update.log"

mkdir -p "$BACKEND_DIR/logs"

# Activate virtualenv
source "$BACKEND_DIR/venv/bin/activate"

# Run from backend/ so relative paths (like ./cricket_assistant.db) still work
cd "$BACKEND_DIR"

echo "──────────────────────────────────────────" >> "$LOG_FILE"
echo "$(date '+%Y-%m-%d %H:%M:%S')  Starting update" >> "$LOG_FILE"

python "$SCRIPT_DIR/update_db.py" >> "$LOG_FILE" 2>&1
EXIT_CODE=$?

echo "$(date '+%Y-%m-%d %H:%M:%S')  Finished (exit $EXIT_CODE)" >> "$LOG_FILE"
exit $EXIT_CODE
