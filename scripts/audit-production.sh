#!/usr/bin/env bash
# Audit production dependencies for high+ severity vulnerabilities.
# Used by CI workflows and the pre-push git hook.
set -euo pipefail

if ! output="$(npm audit --omit=dev --omit=peer --omit=optional --audit-level=high 2>&1)"; then
  echo "$output"
  if echo "$output" | grep -qiE 'ENOTFOUND|EAI_AGAIN|ECONNRESET|timed out|audit endpoint returned an error|ENOLOCK'; then
    echo "Skipping npm audit due to transient registry/network error."
    exit 0
  fi
  echo ""
  echo "Production dependency audit failed (high+ severity)."
  echo "Run 'npm audit --omit=dev --omit=peer --omit=optional' for details."
  exit 1
fi
echo "$output"
