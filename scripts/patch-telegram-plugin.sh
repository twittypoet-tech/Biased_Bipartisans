#!/bin/bash
#
# scripts/patch-telegram-plugin.sh
#
# Re-applies the .mcp.json patch to the newest cached version of the
# telegram@claude-plugins-official plugin. Run this after any plugin update
# (you'll see a new version directory appear in the plugin cache).
#
# The upstream plugin's default .mcp.json uses `bun run start` which relies
# on PATH (breaks on macOS when bun lives at ~/.bun/bin/) and spawns a bash
# subshell via && that also doesn't inherit PATH. This patch replaces the
# default with a direct invocation of server.ts using the absolute bun path.
#
# See docs/plan/10-article-gen-operations.md §8.1 and §12.1 for context.
#
# Usage:
#   ./scripts/patch-telegram-plugin.sh
#
# Exit codes:
#   0 - patched successfully (or already patched)
#   1 - no telegram plugin found in cache
#   2 - bun binary not found at the expected path
#   3 - version directory exists but server.ts is missing

set -euo pipefail

PLUGIN_CACHE="$HOME/.claude/plugins/cache/claude-plugins-official/telegram"
BUN_PATH="$HOME/.bun/bin/bun"

# Sanity: does bun exist at the expected location?
if [ ! -x "$BUN_PATH" ]; then
  echo "ERROR: bun binary not found at $BUN_PATH" >&2
  echo "       Install bun (https://bun.sh) or update this script's BUN_PATH." >&2
  exit 2
fi

# Sanity: does the plugin cache exist?
if [ ! -d "$PLUGIN_CACHE" ]; then
  echo "ERROR: telegram plugin cache not found at $PLUGIN_CACHE" >&2
  echo "       Did you run '/plugin install telegram@claude-plugins-official' yet?" >&2
  exit 1
fi

# Find ALL version directories and patch each one that has server.ts.
# We patch all versions, not just the newest, because Claude Code might
# fall back to an older version if the newest fails to load.
PATCHED=0
SKIPPED=0

for version_dir in "$PLUGIN_CACHE"/*/; do
  [ -d "$version_dir" ] || continue
  version_name=$(basename "$version_dir")
  mcp_file="${version_dir}.mcp.json"
  server_file="${version_dir}server.ts"

  if [ ! -f "$server_file" ]; then
    echo "skip $version_name: no server.ts"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  # Desired content
  desired='{
  "mcpServers": {
    "telegram": {
      "command": "'"$BUN_PATH"'",
      "args": ["${CLAUDE_PLUGIN_ROOT}/server.ts"]
    }
  }
}'

  # Check if already patched (idempotent)
  if [ -f "$mcp_file" ] && grep -q "$BUN_PATH" "$mcp_file" 2>/dev/null && ! grep -q '"run"' "$mcp_file" 2>/dev/null; then
    echo "ok   $version_name: already patched"
    PATCHED=$((PATCHED + 1))
    continue
  fi

  # Back up the original (once — don't clobber an existing backup)
  if [ -f "$mcp_file" ] && [ ! -f "${mcp_file}.orig" ]; then
    cp "$mcp_file" "${mcp_file}.orig"
  fi

  # Write the patched content
  printf '%s\n' "$desired" > "$mcp_file"
  echo "ok   $version_name: patched (backup at .mcp.json.orig)"
  PATCHED=$((PATCHED + 1))
done

if [ "$PATCHED" -eq 0 ]; then
  echo "ERROR: no patchable plugin versions found (SKIPPED=$SKIPPED)" >&2
  exit 3
fi

echo ""
echo "patched $PATCHED version(s), skipped $SKIPPED"
echo ""
echo "Next step: restart the channel session for the patch to take effect:"
echo "  1. In the tmux pane running claude --channels, press Ctrl-c"
echo "  2. cd ~/Biased_Bipartisans && claude --channels plugin:telegram@claude-plugins-official"
echo "  3. Re-paste the ops-console bootstrap prompt"
echo "  4. Re-issue the two /loop commands"
echo ""
echo "Verify: type /mcp inside the channel session — should show plugin:telegram:telegram CONNECTED."
