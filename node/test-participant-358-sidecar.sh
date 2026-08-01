#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
START_SCRIPT="$REPO_ROOT/node/start-local-participant-358.sh"
STOP_SCRIPT="$REPO_ROOT/node/stop-local-participant-358.sh"

[[ -x "$START_SCRIPT" ]]
[[ -x "$STOP_SCRIPT" ]]
grep -Fq 'export SDK_EXAMPLE_LEDGER_ENDPOINT=localhost:$LEDGER_PORT' "$START_SCRIPT"
grep -Fq 'export SDK_EXAMPLE_LEDGER_ADMIN_ENDPOINT=localhost:$LEDGER_PORT' "$START_SCRIPT"
grep -Fq 'export SDK_EXAMPLE_PARTICIPANT_ADMIN_ENDPOINT=localhost:$ADMIN_PORT' "$START_SCRIPT"
grep -Fq 'ensure-ledger-user-read-rights' "$START_SCRIPT"
grep -Fq 'canReadAsAnyParty' "$REPO_ROOT/node/participant-358-synchronizer.mjs"

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
test_ledger_port=18901
test_admin_port=18902
test_json_port=18975
PATH="$stubbin:$PATH" \
DOCKER_LOG="$docker_log" \
PARTICIPANT_358_RUNTIME_DIR="$runtime_dir" \
PARTICIPANT_358_LEDGER_PORT="$test_ledger_port" \
PARTICIPANT_358_ADMIN_PORT="$test_admin_port" \
PARTICIPANT_358_JSON_PORT="$test_json_port" \
PARTICIPANT_358_SKIP_SYNCHRONIZER_CONNECT=1 \
"$START_SCRIPT"

grep -Fqx 'name: canton-participant-358' "$runtime_dir/compose.yaml"
grep -Fqx '  participant358:' "$runtime_dir/compose.yaml"
if grep -Fqx '  canton:' "$runtime_dir/compose.yaml"; then
  echo 'sidecar must not claim the quickstart canton DNS alias' >&2
  exit 1
fi
grep -Fqx '    image: ghcr.io/digital-asset/decentralized-canton-sync/docker/canton:0.6.12' "$runtime_dir/compose.yaml"
grep -Fqx '    image: postgres:16' "$runtime_dir/compose.yaml"
grep -Fqx '      - default' "$runtime_dir/compose.yaml"
grep -Fqx '      - localnet' "$runtime_dir/compose.yaml"
grep -Fqx '          databaseName = participant358' "$runtime_dir/canton.conf"
grep -Fqx '    admin-api {' "$runtime_dir/canton.conf"
grep -Fqx '      address = "0.0.0.0"' "$runtime_dir/canton.conf"
grep -Fqx '      port = 5002' "$runtime_dir/canton.conf"
grep -Fqx "      - \"127.0.0.1:$test_ledger_port:5001\"" "$runtime_dir/compose.yaml"
grep -Fqx "      - \"127.0.0.1:$test_admin_port:5002\"" "$runtime_dir/compose.yaml"
grep -Fqx "      - \"127.0.0.1:$test_json_port:7575\"" "$runtime_dir/compose.yaml"
grep -Fqx '      port = 5002' "$runtime_dir/canton.conf"
grep -Fqx '      port = 7575' "$runtime_dir/canton.conf"
grep -Fq 'PARTICIPANT_358_SYNCHRONIZER_CONFIG=' "$runtime_dir/participant-358.env"
grep -Fq 'PARTICIPANT_358_LEDGER_TOKEN_FILE=' "$runtime_dir/participant-358.env"
test -s "$runtime_dir/ledger-api-user.token"
node -e '
const token = require("node:fs").readFileSync(process.argv[1], "utf8").trim();
const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url"));
if (payload.sub !== "ledger-api-user") throw new Error("unexpected token subject");
if (payload.aud !== "https://canton.network.global") throw new Error("unexpected token audience");
if (!Number.isInteger(payload.iat)) throw new Error("token is missing iat");
if (!Number.isInteger(payload.exp) || payload.exp <= payload.iat) throw new Error("token is missing a future exp");
if (payload.exp - payload.iat !== 300) throw new Error("token lifetime must be 300 seconds");
' "$runtime_dir/ledger-api-user.token"
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
