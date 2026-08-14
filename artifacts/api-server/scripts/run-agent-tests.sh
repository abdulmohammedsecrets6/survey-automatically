#!/usr/bin/env bash
# Run the Infinity AI autonomous Build agentic-loop integration tests.
# 0-euro: uses only Node's built-in test runner + tsx (already in node_modules).
set -euo pipefail

cd "$(dirname "$0")/.." || exit 1

TSX="/workspaces/survey-automatically/Infinity AI/scripts/node_modules/tsx/dist/cli.mjs"
[ -z "$TSX" ] && TSX="$(find /workspaces/survey-automatically/Infinity AI/node_modules -name 'cli.mjs' -path '*tsx*' 2>/dev/null | head -1)"
[ -z "$TSX" ] && echo "tsx not found" >&2 && exit 1

# Banner sets __dirname so workspace.ts resolves WORKSPACE_ROOT to artifacts/workspace.
cat > /tmp/agent-test-banner.mjs <<'BANNER'
import path from "node:path";
globalThis.__filename = import.meta.url;
globalThis.__dirname = path.resolve(process.cwd(), "src/lib");
BANNER

exec node "$TSX" --import /tmp/agent-test-banner.mjs --test \
  src/routes/infinity/__tests__/agent-loop-integration-direct.test.ts
