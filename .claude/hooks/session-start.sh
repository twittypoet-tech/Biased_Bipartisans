#!/bin/bash
set -euo pipefail

# Only run in remote (Claude Code on the web) environments
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"

echo "Session start hook running for Biased_Bipartisans..."

# No dependencies to install yet — this project is in early design mode.
# Add install commands here as the project evolves, for example:
#   npm install          (once package.json is added)
#   pip install -r requirements.txt  (once Python code is added)
#   poetry install       (if using Poetry)

echo "Session start hook complete."
