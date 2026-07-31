#!/usr/bin/env bash
set -euo pipefail

if [[ "${PARTICIPANT_358_SMOKE_TEST:-0}" != "1" ]]; then
  echo "Set PARTICIPANT_358_SMOKE_TEST=1 to run this Docker smoke test against an already-running CN Quickstart localnet."
  exit 0
fi

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
trap 'bash "$SCRIPT_DIR/stop-local-participant-358.sh"' EXIT

bash "$SCRIPT_DIR/start-local-participant-358.sh"
version="$(PARTICIPANT_358_LEDGER_ENDPOINT="localhost:${PARTICIPANT_358_LEDGER_PORT:-8901}" node "$SCRIPT_DIR/participant-358-synchronizer.mjs" ledger-api-version)"
[[ "$version" == 3.5.8* ]] || {
  echo "Expected Canton 3.5.8 Ledger API response, received: $version" >&2
  exit 1
}
echo "Participant 3.5.8 Ledger API response: $version"
