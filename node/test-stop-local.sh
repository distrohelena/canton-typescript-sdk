#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

tmpdir="$(mktemp -d)"
cleanup() {
  rm -rf "$tmpdir"
}
trap cleanup EXIT

run_case() {
  local makefile_targets="$1"
  local expected_output="$2"
  local auth_mode="${3:-shared-secret}"
  local docker_mode="${4:-compose-v2}"
  local quickstart_dir="$tmpdir/quickstart"
  local stubbin="$tmpdir/bin"
  local generated_dir="$tmpdir/generated-stop"

  rm -rf "$quickstart_dir" "$stubbin" "$generated_dir"
  mkdir -p \
    "$quickstart_dir/docker/modules/localnet/env" \
    "$quickstart_dir/docker/modules/pqs" \
    "$quickstart_dir/docker/modules/splice-onboarding" \
    "$quickstart_dir/docker/modules/keycloak" \
    "$stubbin" \
    "$generated_dir"

  printf '%s\n' "$makefile_targets" > "$quickstart_dir/Makefile"
  printf 'DOCKER_NETWORK=quickstart\nSPLICE_VERSION=0.6.5\n' > "$quickstart_dir/.env"
  printf 'AUTH_MODE=%s\n' "$auth_mode" > "$quickstart_dir/.env.local"
  : > "$quickstart_dir/compose.yaml"
  : > "$quickstart_dir/docker/modules/localnet/compose.yaml"
  : > "$quickstart_dir/docker/modules/localnet/compose.env"
  : > "$quickstart_dir/docker/modules/localnet/env/common.env"
  : > "$quickstart_dir/docker/modules/pqs/compose.yaml"
  : > "$quickstart_dir/docker/modules/pqs/compose.env"
  : > "$quickstart_dir/docker/modules/splice-onboarding/compose.yaml"
  : > "$quickstart_dir/docker/modules/keycloak/compose.yaml"
  : > "$quickstart_dir/docker/modules/keycloak/compose.env"

  cat > "$stubbin/make" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

if [[ "${1:-}" == "-qp" ]]; then
  cat Makefile
  exit 0
fi

printf 'stub make %s\n' "$*"
EOF
  chmod +x "$stubbin/make"

  cat > "$stubbin/docker" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
docker_mode="__DOCKER_MODE__"
printf 'stub env MODULES_DIR=%s\n' "${MODULES_DIR:-}"
printf 'stub env LOCALNET_DIR=%s\n' "${LOCALNET_DIR:-}"
printf 'stub env IMAGE_TAG=%s\n' "${IMAGE_TAG:-}"
printf 'stub env APP_PROVIDER_PROFILE=%s\n' "${APP_PROVIDER_PROFILE:-}"
printf 'stub env APP_USER_PROFILE=%s\n' "${APP_USER_PROFILE:-}"
printf 'stub env SV_PROFILE=%s\n' "${SV_PROFILE:-}"
printf 'stub env PQS_SV_PROFILE=%s\n' "${PQS_SV_PROFILE:-}"
if [[ "${1:-}" == "compose" && "${2:-}" == "version" ]]; then
  if [[ "$docker_mode" == "compose-v2" ]]; then
    exit 0
  fi
  exit 1
fi
printf 'stub docker %s\n' "$*"
EOF
  sed -i "s|__DOCKER_MODE__|$docker_mode|" "$stubbin/docker"
  chmod +x "$stubbin/docker"

  cat > "$stubbin/docker-compose" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
docker_mode="__DOCKER_MODE__"
if [[ "${1:-}" == "version" ]]; then
  if [[ "$docker_mode" == "compose-v1" ]]; then
    exit 0
  fi
  exit 1
fi
printf 'stub docker-compose %s\n' "$*"
EOF
  sed -i "s|__DOCKER_MODE__|$docker_mode|" "$stubbin/docker-compose"
  chmod +x "$stubbin/docker-compose"

  local output
  output="$(
    cd "$SCRIPT_DIR"
    CN_QUICKSTART_DIR="$quickstart_dir" \
      START_LOCAL_GENERATED_DIR="$generated_dir" \
      PATH="$stubbin:$PATH" \
      bash ./stop-local.sh
  )"

  if ! grep -Fxq "$expected_output" <<<"$output"; then
    printf 'expected output line %q, got:\n%s\n' "$expected_output" "$output" >&2
    exit 1
  fi
}

run_case $'.PHONY: stop-local-ledger\nstop-local-ledger:\n' 'stub make stop-local-ledger'
run_case $'.PHONY: stop\nstop:\n' 'stub docker compose -f compose.yaml -f '"$tmpdir"'/quickstart/docker/modules/localnet/compose.yaml -f '"$tmpdir"'/quickstart/docker/modules/splice-onboarding/compose.yaml -f '"$tmpdir"'/quickstart/docker/modules/pqs/compose.yaml --env-file .env --env-file .env.local --env-file '"$tmpdir"'/quickstart/docker/modules/localnet/compose.env --env-file '"$tmpdir"'/quickstart/docker/modules/localnet/env/common.env --env-file '"$tmpdir"'/quickstart/docker/modules/pqs/compose.env --profile app-provider --profile pqs-app-provider --profile pqs-sv down -v --remove-orphans'
run_case $'.PHONY: stop\nstop:\n' 'stub docker compose -f compose.yaml -f '"$tmpdir"'/quickstart/docker/modules/localnet/compose.yaml -f '"$tmpdir"'/quickstart/docker/modules/splice-onboarding/compose.yaml -f '"$tmpdir"'/quickstart/docker/modules/pqs/compose.yaml --env-file .env --env-file .env.local --env-file '"$tmpdir"'/quickstart/docker/modules/localnet/compose.env --env-file '"$tmpdir"'/quickstart/docker/modules/localnet/env/common.env --env-file '"$tmpdir"'/quickstart/docker/modules/pqs/compose.env --profile app-provider --profile pqs-app-provider --profile pqs-sv -f '"$tmpdir"'/quickstart/docker/modules/keycloak/compose.yaml --env-file '"$tmpdir"'/quickstart/docker/modules/keycloak/compose.env --profile keycloak down -v --remove-orphans' oauth2
run_case $'.PHONY: stop\nstop:\n' 'stub docker-compose -f compose.yaml -f '"$tmpdir"'/quickstart/docker/modules/localnet/compose.yaml -f '"$tmpdir"'/quickstart/docker/modules/splice-onboarding/compose.yaml -f '"$tmpdir"'/quickstart/docker/modules/pqs/compose.yaml --env-file .env --env-file .env.local --env-file '"$tmpdir"'/quickstart/docker/modules/localnet/compose.env --env-file '"$tmpdir"'/quickstart/docker/modules/localnet/env/common.env --env-file '"$tmpdir"'/quickstart/docker/modules/pqs/compose.env --profile app-provider --profile pqs-app-provider --profile pqs-sv down -v --remove-orphans' shared-secret compose-v1

