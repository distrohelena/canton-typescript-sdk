#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
START_SCRIPT="$REPO_ROOT/node/start-local-participant-358.sh"
STOP_SCRIPT="$REPO_ROOT/node/stop-local-participant-358.sh"

[[ -x "$START_SCRIPT" ]]
[[ -x "$STOP_SCRIPT" ]]

tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

stubbin="$tmpdir/bin"
mkdir -p "$stubbin"
cat > "$stubbin/docker" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' "$*" >> "$DOCKER_LOG"
if [[ "$1" == "compose" && "$2" == "version" ]]; then
  exit 0
fi
EOF
chmod +x "$stubbin/docker"

runtime_dir="$tmpdir/runtime"
docker_log="$tmpdir/docker.log"
PATH="$stubbin:$PATH" \
DOCKER_LOG="$docker_log" \
PARTICIPANT_358_RUNTIME_DIR="$runtime_dir" \
PARTICIPANT_358_SKIP_SYNCHRONIZER_CONNECT=1 \
"$START_SCRIPT"

grep -Fqx 'name: canton-participant-358' "$runtime_dir/compose.yaml"
grep -Fqx '    image: ghcr.io/digital-asset/decentralized-canton-sync/docker/canton:0.6.12' "$runtime_dir/compose.yaml"
grep -Fqx '    image: postgres:16' "$runtime_dir/compose.yaml"
grep -Fqx '      - default' "$runtime_dir/compose.yaml"
grep -Fqx '      - localnet' "$runtime_dir/compose.yaml"
grep -Fqx '    databaseName = participant358' "$runtime_dir/canton.conf"
grep -Fqx '    admin-api {' "$runtime_dir/canton.conf"
grep -Fqx '      address = "0.0.0.0"' "$runtime_dir/canton.conf"
grep -Fqx '      port = 5002' "$runtime_dir/canton.conf"
grep -Fqx '      - "127.0.0.1:8901:5001"' "$runtime_dir/compose.yaml"
grep -Fqx '    port = 5002' "$runtime_dir/canton.conf"
grep -Fqx '    port = 7575' "$runtime_dir/canton.conf"
grep -Fqx 'PARTICIPANT_358_SYNCHRONIZER_CONFIG=' "$runtime_dir/participant-358.env"
grep -F -- '--project-name canton-participant-358' "$docker_log"
grep -Fqx '    name: quickstart' "$runtime_dir/compose.yaml"

if PATH="$stubbin:$PATH" PARTICIPANT_358_LEDGER_PORT=3901 "$START_SCRIPT" >/dev/null 2>&1; then
  echo 'sidecar launcher accepted a CN Quickstart Ledger port' >&2
  exit 1
fi

PATH="$stubbin:$PATH" \
DOCKER_LOG="$docker_log" \
PARTICIPANT_358_RUNTIME_DIR="$runtime_dir" \
"$STOP_SCRIPT"

grep -F -- '--project-name canton-participant-358' "$docker_log"
if grep -Eq -- '(^| )down( |$).*quickstart|quickstart.*(^| )down( |$)' "$docker_log"; then
  echo 'stop launcher targeted quickstart' >&2
  exit 1
fi
