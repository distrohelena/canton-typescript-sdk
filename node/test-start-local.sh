#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT_DIR="$REPO_ROOT/node"
REPO_ENV_FILE="$REPO_ROOT/.env"

tmpdir="$(mktemp -d)"
real_docker="$(command -v docker || true)"
root_env_backup="$tmpdir/root-env.backup"
root_env_exists=0
if [[ -f "$REPO_ENV_FILE" ]]; then
  cp "$REPO_ENV_FILE" "$root_env_backup"
  root_env_exists=1
fi

cleanup() {
  if (( root_env_exists )); then
    cp "$root_env_backup" "$REPO_ENV_FILE"
  else
    rm -f "$REPO_ENV_FILE"
  fi
  rm -rf "$tmpdir"
}
trap cleanup EXIT

run_case() {
  local makefile_targets="$1"
  local expected_output="$2"
  local auth_mode="${3:-shared-secret}"
  local docker_mode="${4:-default}"
  local extra_participants="${5:-}"
  local cn_quickstart_dir_override="${6:-}"
  local repo_root_env_contents="${7:-}"
  local es256_enabled="${8:-0}"
  local tls_enabled="${9:-0}"
  local tls_cert_chain_path="${10:-}"
  local tls_private_key_path="${11:-}"
  local tls_ca_cert_path="${12:-}"
  local expected_status="${13:-0}"
  local quickstart_dir="$tmpdir/quickstart"
  local quickstart_root_dir="$tmpdir/cn-quickstart"
  local stubbin="$tmpdir/bin"
  local generated_dir="$tmpdir/generated"
  local docker_state_dir="$tmpdir/docker-state"

  rm -rf "$quickstart_dir" "$quickstart_root_dir" "$stubbin" "$generated_dir" "$docker_state_dir" "$tmpdir/tls"
  mkdir -p \
    "$quickstart_root_dir" \
    "$quickstart_dir/docker/modules/localnet/env" \
    "$quickstart_dir/docker/modules/pqs" \
    "$quickstart_dir/docker/modules/splice-onboarding" \
    "$quickstart_dir/docker/modules/keycloak" \
    "$stubbin" \
    "$generated_dir" \
    "$docker_state_dir"
  printf '0\n' > "$docker_state_dir/readiness-seconds"
  ln -s "$quickstart_dir" "$quickstart_root_dir/quickstart"
  printf '%s\n' "$makefile_targets" > "$quickstart_dir/Makefile"
  printf '%s\n' \
    'DOCKER_NETWORK=quickstart' \
    'SPLICE_VERSION=0.6.5' \
    'SCRIBE_IMAGE=scribe' \
    'SCRIBE_VERSION=test' \
    'POSTGRES_VERSION=16' \
    'DB_USER=test' \
    'DB_PASSWORD=test' \
    > "$quickstart_dir/.env"
  cat > "$quickstart_dir/compose.yaml" <<'EOF'
volumes:
  onboarding:

services:
  postgres:
    image: postgres:16
  canton:
    image: canton:test
  splice:
    image: splice:test
  splice-onboarding:
    image: onboarding:test
  pqs-app-provider:
    image: pqs:test
  pqs-app-user:
    image: pqs:test
  pqs-sv:
    image: pqs:test
EOF
  printf 'AUTH_MODE=%s\n' "$auth_mode" > "$quickstart_dir/.env.local"
  : > "$quickstart_dir/docker/modules/localnet/compose.yaml"
  : > "$quickstart_dir/docker/modules/localnet/compose.env"
  : > "$quickstart_dir/docker/modules/localnet/env/common.env"
  : > "$quickstart_dir/docker/modules/pqs/compose.yaml"
  : > "$quickstart_dir/docker/modules/pqs/compose.env"
  cat > "$quickstart_dir/docker/modules/splice-onboarding/compose.yaml" <<'EOF'
services:
  splice-onboarding:
    depends_on:
      splice:
        condition: service_healthy
EOF
  printf '%s\n' \
    'curl_check "http://$participant/v2/users"' \
    'curl_check "http://$validator/api/validator/v0/scan-proxy/dso-party-id"' \
    > "$quickstart_dir/docker/modules/splice-onboarding/docker-utils.sh"
  mkdir -p "$quickstart_dir/docker/modules/splice-onboarding/docker"
  mv "$quickstart_dir/docker/modules/splice-onboarding/docker-utils.sh" \
    "$quickstart_dir/docker/modules/splice-onboarding/docker/utils.sh"
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
printf 'stub env AUTH_MODE=%s\n' "${AUTH_MODE:-}"
if [[ "${1:-}" == "inspect" ]]; then
  container="${!#}"
  state_file="${START_LOCAL_TEST_DOCKER_STATE_DIR}/${docker_mode}-${container}.count"
  count=0
  if [[ -f "$state_file" ]]; then
    count="$(<"$state_file")"
  fi
  count=$((count + 1))
  printf '%s\n' "$count" > "$state_file"

  lifecycle=running
  health=healthy
  case "$docker_mode:$container" in
    slow-canton:canton)
      if (( count <= 31 )); then health=starting; fi
      ;;
    slow-splice:splice)
      if (( count <= 61 )); then health=starting; fi
      ;;
    restarting-canton:canton)
      if (( count == 1 )); then
        lifecycle=restarting
        health=unhealthy
      fi
      ;;
    restarting-healthy-canton:canton)
      if (( count == 1 )); then
        lifecycle=restarting
        health=healthy
      fi
      ;;
    exited-canton:canton)
      lifecycle=exited
      health=unhealthy
      ;;
  esac

  if [[ "$*" == *'.State.Status'* ]]; then
    printf '%s %s\n' "$lifecycle" "$health"
  else
    printf '%s\n' "$health"
  fi
  exit 0
fi
if [[ "${1:-}" == "logs" ]]; then
  printf 'stub log tail for %s\n' "${!#}"
  exit 0
fi
if [[ "${1:-}" == "exec" ]]; then
  if [[ "$*" == *"http://localhost:"* ]]; then
    printf '%s\n' "$*" > "${START_LOCAL_TEST_DOCKER_STATE_DIR}/extra-healthcheck-command"
    healthcheck_state_file="${START_LOCAL_TEST_DOCKER_STATE_DIR}/${docker_mode}-extra-healthcheck.count"
    healthcheck_count=0
    if [[ -f "$healthcheck_state_file" ]]; then
      healthcheck_count="$(<"$healthcheck_state_file")"
    fi
    healthcheck_count=$((healthcheck_count + 1))
    printf '%s\n' "$healthcheck_count" > "$healthcheck_state_file"
    if [[ "$docker_mode" == "slow-extra-health" && "$healthcheck_count" == "1" ]]; then
      exit 1
    fi
  fi
  extra_pqs_config_file=""
    while (( "$#" )); do
      if [[ "${1:-}" == "-e" && "${2:-}" == EXTRA_PQS_CONFIG_FILE=* ]]; then
        extra_pqs_config_file="${2#EXTRA_PQS_CONFIG_FILE=}"
      break
    fi
    shift
  done
  if [[ -n "$extra_pqs_config_file" && -n "${START_LOCAL_GENERATED_DIR:-}" ]]; then
    cat > "${START_LOCAL_GENERATED_DIR}/${extra_pqs_config_file}" <<'CONFIG'
pipeline.datasource=TransactionTreeStream
pipeline.ledger.start=Oldest
pipeline.oauth.accessToken="stub-token"
CONFIG
  fi
  exit 0
fi
if [[ "${1:-}" == "compose" && "${2:-}" == "version" ]]; then
  if [[ "$docker_mode" == "compose-v1" ]]; then
    exit 1
  fi
  exit 0
fi
printf 'stub docker %s\n' "$*"
if [[ "$*" == *" up -d --no-recreate pqs-extra-1"* ]]; then
  printf 'stub extra pqs startup\n'
fi
  if [[ "$docker_mode" == "staged-start" ]]; then
  if [[ "${1:-}" == "compose" && "$*" == *" down -v --remove-orphans"* ]]; then
    exit 0
  fi
  if [[ "${1:-}" == "compose" && "$*" == *" up -d --no-recreate postgres canton"* ]]; then
    exit 0
  fi
  if [[ "$*" == *" up -d --no-recreate --no-deps splice"* ]]; then
    exit 0
  fi
  if [[ "$*" == *" create splice-onboarding"* ]]; then
    exit 0
  fi
  if [[ "$*" == *" ps -a -q splice-onboarding"* ]]; then
    printf 'splice-onboarding\n'
    exit 0
  fi
  if [[ "${1:-}" == "start" && "${2:-}" == "splice-onboarding" ]]; then
    exit 0
  fi
  if [[ "$*" == *" up -d --no-recreate pqs-app-provider pqs-sv"* ]]; then
    exit 0
  fi
  exit 1
fi
EOF
  sed -i "s|__DOCKER_MODE__|$docker_mode|" "$stubbin/docker"
  chmod +x "$stubbin/docker"

cat > "$stubbin/sleep" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
if [[ -n "${START_LOCAL_TEST_READINESS_CLOCK_FILE:-}" ]]; then
  current="$(<"$START_LOCAL_TEST_READINESS_CLOCK_FILE")"
  printf '%s\n' "$((current + ${1:-0}))" > "$START_LOCAL_TEST_READINESS_CLOCK_FILE"
fi
EOF
  chmod +x "$stubbin/sleep"

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
  local status=0
  output="$(
    if [[ -n "$repo_root_env_contents" ]]; then
      printf '%s\n' "$repo_root_env_contents" > "$REPO_ENV_FILE"
    else
      rm -f "$REPO_ENV_FILE"
    fi
    cd "$SCRIPT_DIR"
    if [[ "$cn_quickstart_dir_override" == "__unset__" ]]; then
      env -i \
        HOME="$HOME" \
        TERM="${TERM:-dumb}" \
        START_LOCAL_GENERATED_DIR="$generated_dir" \
        START_LOCAL_ES256_RUNTIME_DIR="$tmpdir/es256" \
        START_LOCAL_TLS_RUNTIME_DIR="$tmpdir/tls" \
        LOCALNET_ES256_JWT="$es256_enabled" \
        LOCALNET_TLS="$tls_enabled" \
        LOCALNET_TLS_ROTATE=1 \
        LOCALNET_TLS_CERT_CHAIN_PATH="$tls_cert_chain_path" \
        LOCALNET_TLS_PRIVATE_KEY_PATH="$tls_private_key_path" \
        LOCALNET_TLS_CA_CERT_PATH="$tls_ca_cert_path" \
        START_LOCAL_TEST_DOCKER_STATE_DIR="$docker_state_dir" \
        START_LOCAL_TEST_READINESS_CLOCK_FILE="$docker_state_dir/readiness-seconds" \
        EXTRA_PARTICIPANTS="$extra_participants" \
        PATH="$stubbin:$PATH" \
        bash ./start-local.sh 2>&1
    else
      CN_QUICKSTART_DIR="${cn_quickstart_dir_override:-$quickstart_dir}" \
        START_LOCAL_GENERATED_DIR="$generated_dir" \
        START_LOCAL_ES256_RUNTIME_DIR="$tmpdir/es256" \
        START_LOCAL_TLS_RUNTIME_DIR="$tmpdir/tls" \
        LOCALNET_ES256_JWT="$es256_enabled" \
        LOCALNET_TLS="$tls_enabled" \
        LOCALNET_TLS_ROTATE=1 \
        LOCALNET_TLS_CERT_CHAIN_PATH="$tls_cert_chain_path" \
        LOCALNET_TLS_PRIVATE_KEY_PATH="$tls_private_key_path" \
        LOCALNET_TLS_CA_CERT_PATH="$tls_ca_cert_path" \
        START_LOCAL_TEST_DOCKER_STATE_DIR="$docker_state_dir" \
        START_LOCAL_TEST_READINESS_CLOCK_FILE="$docker_state_dir/readiness-seconds" \
        EXTRA_PARTICIPANTS="$extra_participants" \
        PATH="$stubbin:$PATH" \
        bash ./start-local.sh 2>&1
    fi
  )" || status=$?

  if [[ "$expected_status" == "0" && "$status" != "0" ]]; then
    printf 'expected successful start-local case, got status %s and output:\n%s\n' "$status" "$output" >&2
    exit 1
  fi
  if [[ "$expected_status" != "0" && "$status" == "0" ]]; then
    printf 'expected failing start-local case, got success and output:\n%s\n' "$output" >&2
    exit 1
  fi

  if ! grep -Fxq "$expected_output" <<<"$output"; then
    printf 'expected output line %q, got:\n%s\n' "$expected_output" "$output" >&2
    exit 1
  fi
}

assert_file_contains() {
  local path="$1"
  local expected="$2"

  if ! grep -Fqx "$expected" "$path"; then
    printf 'expected file %s to contain line %q, got:\n' "$path" "$expected" >&2
    cat "$path" >&2
    exit 1
  fi
}

assert_file_contains_text() {
  local path="$1"
  local expected="$2"

  if ! grep -Fq "$expected" "$path"; then
    printf 'expected file %s to contain text %q, got:\n' "$path" "$expected" >&2
    cat "$path" >&2
    exit 1
  fi
}

assert_file_mode() {
  local path="$1"
  local expected="$2"
  local actual
  actual="$(stat -c '%a' "$path")"
  if [[ "$actual" != "$expected" ]]; then
    printf 'expected file %s mode %s, got %s\n' "$path" "$expected" "$actual" >&2
    exit 1
  fi
}

run_repo_root_env_case() {
  local quickstart_dir="$tmpdir/quickstart"
  local quickstart_root_dir="$tmpdir/custom-quickstart-root"
  local stubbin="$tmpdir/bin"
  local generated_dir="$tmpdir/generated"
  local isolated_repo_root="$tmpdir/isolated-repo"
  local isolated_script_dir="$isolated_repo_root/node"
  local output

  rm -rf "$quickstart_dir" "$quickstart_root_dir" "$tmpdir/cn-quickstart" "$stubbin" "$generated_dir" "$isolated_repo_root"
  mkdir -p \
    "$quickstart_root_dir" \
    "$quickstart_dir/docker/modules/localnet/env" \
    "$quickstart_dir/docker/modules/pqs" \
    "$quickstart_dir/docker/modules/splice-onboarding" \
    "$quickstart_dir/docker/modules/keycloak" \
    "$stubbin" \
    "$generated_dir" \
    "$isolated_script_dir"
  ln -s "$quickstart_dir" "$quickstart_root_dir/quickstart"

  printf '.PHONY: start\nstart:\n' > "$quickstart_dir/Makefile"
  printf 'DOCKER_NETWORK=quickstart\nSPLICE_VERSION=0.6.5\n' > "$quickstart_dir/.env"
  printf 'AUTH_MODE=shared-secret\n' > "$quickstart_dir/.env.local"
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
printf 'stub env MODULES_DIR=%s\n' "${MODULES_DIR:-}"
printf 'stub env LOCALNET_DIR=%s\n' "${LOCALNET_DIR:-}"
printf 'stub env IMAGE_TAG=%s\n' "${IMAGE_TAG:-}"
printf 'stub env APP_PROVIDER_PROFILE=%s\n' "${APP_PROVIDER_PROFILE:-}"
printf 'stub env APP_USER_PROFILE=%s\n' "${APP_USER_PROFILE:-}"
printf 'stub env SV_PROFILE=%s\n' "${SV_PROFILE:-}"
printf 'stub env PQS_SV_PROFILE=%s\n' "${PQS_SV_PROFILE:-}"
printf 'stub env AUTH_MODE=%s\n' "${AUTH_MODE:-}"
if [[ "${1:-}" == "inspect" ]]; then
  if [[ "$*" == *'.State.Status'* ]]; then
    printf 'running healthy\n'
  else
    printf 'healthy\n'
  fi
  exit 0
fi
if [[ "${1:-}" == "exec" ]]; then
  exit 0
fi
printf 'stub docker %s\n' "$*"
EOF
  chmod +x "$stubbin/docker"

  cp "$SCRIPT_DIR/start-local.sh" "$isolated_script_dir/start-local.sh"
  chmod +x "$isolated_script_dir/start-local.sh"
  printf 'CN_QUICKSTART_DIR=%s\n' "$quickstart_root_dir" > "$isolated_repo_root/.env"

  output="$(
    cd "$isolated_script_dir"
    env -i \
      HOME="$HOME" \
      TERM="${TERM:-dumb}" \
      START_LOCAL_GENERATED_DIR="$generated_dir" \
      PATH="$stubbin:$PATH" \
      bash ./start-local.sh
  )"

  if ! grep -Fxq "stub env MODULES_DIR=$quickstart_root_dir/quickstart/docker/modules" <<<"$output"; then
    printf 'expected repo root .env quickstart path to resolve, got:\n%s\n' "$output" >&2
    exit 1
  fi
}

run_case $'.PHONY: start-local-ledger\nstart-local-ledger:\n' 'stub make start-local-ledger'
run_case $'.PHONY: start\nstart:\n' 'stub env MODULES_DIR='"$tmpdir"'/quickstart/docker/modules'
run_case $'.PHONY: start\nstart:\n' 'stub env IMAGE_TAG=0.6.5'
run_case $'.PHONY: start\nstart:\n' 'stub env APP_USER_PROFILE=off'
run_case $'.PHONY: start\nstart:\n' 'stub env SV_PROFILE=on'
run_case $'.PHONY: start\nstart:\n' 'stub env PQS_SV_PROFILE=on'
run_case $'.PHONY: start\nstart:\n' 'stub env AUTH_MODE=oauth2' oauth2
run_case $'.PHONY: start\nstart:\n' 'canton readiness: running/starting' shared-secret slow-canton
run_case $'.PHONY: start\nstart:\n' 'canton is still not ready (state: running, health: starting).' shared-secret slow-canton
run_case $'.PHONY: start\nstart:\n' 'stub log tail for canton' shared-secret slow-canton
run_case $'.PHONY: start\nstart:\n' 'canton readiness: restarting/unhealthy' shared-secret restarting-canton
run_case $'.PHONY: start\nstart:\n' 'canton readiness: running/healthy' shared-secret restarting-healthy-canton
run_case $'.PHONY: start\nstart:\n' 'canton is not running (state: exited).' shared-secret exited-canton '' '' '' 0 0 '' '' '' 1
run_case $'.PHONY: start\nstart:\n' 'stub log tail for canton' shared-secret exited-canton '' '' '' 0 0 '' '' '' 1
run_case $'.PHONY: start\nstart:\n' 'splice readiness: running/starting' shared-secret slow-splice 1
run_case $'.PHONY: start\nstart:\n' 'stub extra pqs startup' shared-secret slow-splice 1
run_case $'.PHONY: start\nstart:\n' 'stub docker compose -f compose.yaml -f '"$tmpdir"'/quickstart/docker/modules/localnet/compose.yaml -f '"$tmpdir"'/quickstart/docker/modules/splice-onboarding/compose.yaml -f '"$tmpdir"'/quickstart/docker/modules/pqs/compose.yaml --env-file .env --env-file .env.local --env-file '"$tmpdir"'/quickstart/docker/modules/localnet/compose.env --env-file '"$tmpdir"'/quickstart/docker/modules/localnet/env/common.env --env-file '"$tmpdir"'/quickstart/docker/modules/pqs/compose.env --profile app-provider --profile pqs-app-provider --profile pqs-sv down -v --remove-orphans'
run_case $'.PHONY: start\nstart:\n' 'stub docker compose -f compose.yaml -f '"$tmpdir"'/quickstart/docker/modules/localnet/compose.yaml -f '"$tmpdir"'/quickstart/docker/modules/splice-onboarding/compose.yaml -f '"$tmpdir"'/quickstart/docker/modules/pqs/compose.yaml --env-file .env --env-file .env.local --env-file '"$tmpdir"'/quickstart/docker/modules/localnet/compose.env --env-file '"$tmpdir"'/quickstart/docker/modules/localnet/env/common.env --env-file '"$tmpdir"'/quickstart/docker/modules/pqs/compose.env --profile app-provider --profile pqs-app-provider --profile pqs-sv up -d --no-recreate postgres canton'
run_case $'.PHONY: start\nstart:\n' 'stub docker compose -f compose.yaml -f '"$tmpdir"'/quickstart/docker/modules/localnet/compose.yaml -f '"$tmpdir"'/quickstart/docker/modules/splice-onboarding/compose.yaml -f '"$tmpdir"'/quickstart/docker/modules/pqs/compose.yaml --env-file .env --env-file .env.local --env-file '"$tmpdir"'/quickstart/docker/modules/localnet/compose.env --env-file '"$tmpdir"'/quickstart/docker/modules/localnet/env/common.env --env-file '"$tmpdir"'/quickstart/docker/modules/pqs/compose.env --profile app-provider --profile pqs-app-provider --profile pqs-sv -f '"$tmpdir"'/quickstart/docker/modules/keycloak/compose.yaml --env-file '"$tmpdir"'/quickstart/docker/modules/keycloak/compose.env --profile keycloak down -v --remove-orphans' oauth2
run_case $'.PHONY: start\nstart:\n' 'stub docker compose -f compose.yaml -f '"$tmpdir"'/quickstart/docker/modules/localnet/compose.yaml -f '"$tmpdir"'/quickstart/docker/modules/splice-onboarding/compose.yaml -f '"$tmpdir"'/quickstart/docker/modules/pqs/compose.yaml --env-file .env --env-file .env.local --env-file '"$tmpdir"'/quickstart/docker/modules/localnet/compose.env --env-file '"$tmpdir"'/quickstart/docker/modules/localnet/env/common.env --env-file '"$tmpdir"'/quickstart/docker/modules/pqs/compose.env --profile app-provider --profile pqs-app-provider --profile pqs-sv -f '"$tmpdir"'/quickstart/docker/modules/keycloak/compose.yaml --env-file '"$tmpdir"'/quickstart/docker/modules/keycloak/compose.env --profile keycloak up -d --no-recreate keycloak nginx-keycloak postgres canton' oauth2
run_case $'.PHONY: start\nstart:\n' 'stub docker-compose -f compose.yaml -f '"$tmpdir"'/quickstart/docker/modules/localnet/compose.yaml -f '"$tmpdir"'/quickstart/docker/modules/splice-onboarding/compose.yaml -f '"$tmpdir"'/quickstart/docker/modules/pqs/compose.yaml --env-file .env --env-file .env.local --env-file '"$tmpdir"'/quickstart/docker/modules/localnet/compose.env --env-file '"$tmpdir"'/quickstart/docker/modules/localnet/env/common.env --env-file '"$tmpdir"'/quickstart/docker/modules/pqs/compose.env --profile app-provider --profile pqs-app-provider --profile pqs-sv down -v --remove-orphans' shared-secret compose-v1
run_case $'.PHONY: start\nstart:\n' 'stub docker compose -f compose.yaml -f '"$tmpdir"'/quickstart/docker/modules/localnet/compose.yaml -f '"$tmpdir"'/quickstart/docker/modules/splice-onboarding/compose.yaml -f '"$tmpdir"'/quickstart/docker/modules/pqs/compose.yaml --env-file .env --env-file .env.local --env-file '"$tmpdir"'/quickstart/docker/modules/localnet/compose.env --env-file '"$tmpdir"'/quickstart/docker/modules/localnet/env/common.env --env-file '"$tmpdir"'/quickstart/docker/modules/pqs/compose.env --profile app-provider --profile pqs-app-provider --profile pqs-sv -f '"$tmpdir"'/generated/compose-extra-participants.yaml --env-file '"$tmpdir"'/generated/extra-participants.env down -v --remove-orphans' shared-secret default 3
run_case $'.PHONY: start\nstart:\n' 'stub docker compose -f compose.yaml -f '"$tmpdir"'/quickstart/docker/modules/localnet/compose.yaml -f '"$tmpdir"'/quickstart/docker/modules/splice-onboarding/compose.yaml -f '"$tmpdir"'/quickstart/docker/modules/pqs/compose.yaml --env-file .env --env-file .env.local --env-file '"$tmpdir"'/quickstart/docker/modules/localnet/compose.env --env-file '"$tmpdir"'/quickstart/docker/modules/localnet/env/common.env --env-file '"$tmpdir"'/quickstart/docker/modules/pqs/compose.env --profile app-provider --profile pqs-app-provider --profile pqs-sv -f '"$tmpdir"'/generated/compose-extra-participants.yaml --env-file '"$tmpdir"'/generated/extra-participants.env up -d --no-recreate pqs-extra-1 pqs-extra-2 pqs-extra-3' shared-secret default 3
run_case $'.PHONY: start\nstart:\n' 'ES256 bearer token written to '"$tmpdir"'/es256/ledger-api-user.token' shared-secret default 3 '' '' 1
assert_file_contains_text "$tmpdir/docker-state/extra-healthcheck-command" 'wget -q --timeout=2 --tries=1 -O /dev/null http://localhost:5900/health'
assert_file_contains_text "$tmpdir/docker-state/extra-healthcheck-command" 'wget -q --timeout=2 --tries=1 -O /dev/null http://localhost:6900/health'
assert_file_contains_text "$tmpdir/docker-state/extra-healthcheck-command" 'wget -q --timeout=2 --tries=1 -O /dev/null http://localhost:7900/health'
assert_file_contains "$tmpdir/es256/canton-es256.conf" 'canton.participants.app-provider.ledger-api.auth-services = ['
assert_file_contains "$tmpdir/es256/canton-es256.conf" '    type = jwt-es-256-crt'
assert_file_contains "$tmpdir/es256/canton-es256.conf" '    certificate = "/app/es256-certificate.pem"'
if grep -Fq 'canton.participants.app-user.ledger-api.auth-services' "$tmpdir/es256/canton-es256.conf"; then
  echo "unexpected ES256 configuration for inactive app-user participant" >&2
  exit 1
fi
assert_file_contains "$tmpdir/generated/additional-config.extra-participants.conf" 'canton.participants.extra-3.ledger-api.auth-services = ['
assert_file_contains "$tmpdir/generated/extra-participants.env" 'CREATE_DATABASE_EXTRA_1=participant-extra-1'
assert_file_contains "$tmpdir/generated/extra-participants.env" 'CREATE_DATABASE_EXTRA_VALIDATOR_1=validator-extra-1'
assert_file_contains "$tmpdir/generated/extra-participants.env" 'EXTRA_PARTICIPANT_1_ADMIN_API_PORT=5902'
assert_file_contains "$tmpdir/generated/extra-participants.env" 'EXTRA_PARTICIPANT_3_JSON_API_PORT=7975'
assert_file_contains "$tmpdir/generated/extra-participants.env" 'EXTRA_VALIDATOR_1_PARTY_HINT=validator_1_quickstart-localparty-1'
assert_file_contains "$tmpdir/generated/extra-participants.env" 'EXTRA_VALIDATOR_1_ONBOARDING_SECRET=extra-1-validator-onboarding-secret'
assert_file_contains "$tmpdir/generated/extra-participants.env" 'EXTRA_VALIDATOR_1_ADMIN_API_PORT=5903'
assert_file_contains "$tmpdir/generated/extra-participants.env" 'EXTRA_VALIDATOR_3_ADMIN_API_PUBLISHED_PORT=7903'
assert_file_contains "$tmpdir/generated/extra-participants.env" 'EXTRA_VALIDATOR_1_USER_NAME=ledger-api-user'
assert_file_contains "$tmpdir/generated/extra-participants.env" 'EXTRA_VALIDATOR_1_WALLET_ADMIN_USER_NAME=extra-1'
assert_file_contains "$tmpdir/generated/extra-participants.env" 'EXTRA_VALIDATOR_1_AUTH_AUDIENCE=https://canton.network.global'
assert_file_contains "$tmpdir/generated/extra-participants.env" 'CREATE_DATABASE_EXTRA_PQS_1=pqs-extra-1'
run_case $'.PHONY: start\nstart:\n' 'stub extra pqs startup' shared-secret slow-extra-health 3
assert_file_contains "$tmpdir/docker-state/slow-extra-health-extra-healthcheck.count" '2'
assert_file_contains "$tmpdir/generated/extra-participants.env" 'EXTRA_PQS_1_POSTGRES_PUBLISHED_PORT=5541'
assert_file_contains "$tmpdir/generated/extra-participants.env" 'EXTRA_PQS_3_POSTGRES_PUBLISHED_PORT=5543'
assert_file_contains "$tmpdir/generated/compose-extra-participants.yaml" '      ADDITIONAL_CONFIG_EXTRA_PARTICIPANTS: |'
assert_file_contains "$tmpdir/generated/compose-extra-participants.yaml" '        canton.participants.extra-1 = $${_participant} {'
assert_file_contains "$tmpdir/generated/compose-extra-participants.yaml" '  splice:'
assert_file_contains "$tmpdir/generated/compose-extra-participants.yaml" '      ADDITIONAL_CONFIG_EXTRA_VALIDATORS: |'
assert_file_contains "$tmpdir/generated/compose-extra-participants.yaml" '        canton.validator-apps.extra-1-validator_backend = $${_validator_backend} {'
assert_file_contains "$tmpdir/generated/compose-extra-participants.yaml" '      - "${EXTRA_VALIDATOR_1_ADMIN_API_PUBLISHED_PORT}:${EXTRA_VALIDATOR_1_ADMIN_API_PORT}"'
assert_file_contains "$tmpdir/generated/compose-extra-participants.yaml" '          init {'
assert_file_contains "$tmpdir/generated/compose-extra-participants.yaml" '            generate-topology-transactions-and-keys = true'
assert_file_contains "$tmpdir/generated/compose-extra-participants.yaml" '            identity.type = auto'
assert_file_contains "$tmpdir/generated/compose-extra-participants.yaml" '  postgres-pqs-extra-1:'
assert_file_contains "$tmpdir/generated/compose-extra-participants.yaml" '    container_name: postgres-pqs-extra-1'
assert_file_contains "$tmpdir/generated/compose-extra-participants.yaml" '      - "${EXTRA_PQS_1_POSTGRES_PUBLISHED_PORT}:5432"'
assert_file_contains "$tmpdir/generated/compose-extra-participants.yaml" '  pqs-extra-1:'
assert_file_contains "$tmpdir/generated/compose-extra-participants.yaml" '    container_name: pqs-extra-1'
assert_file_contains "$tmpdir/generated/compose-extra-participants.yaml" '      SCRIBE_CONFIG: /onboarding/extra-1-pqs.conf'
assert_file_contains "$tmpdir/generated/extra-1-pqs.conf" 'pipeline.datasource=TransactionTreeStream'
assert_file_contains "$tmpdir/generated/extra-1-pqs.conf" 'pipeline.ledger.start=Oldest'
assert_file_contains "$tmpdir/generated/extra-1-pqs.conf" 'pipeline.oauth.accessToken="stub-token"'
assert_file_contains "$tmpdir/generated/additional-config.extra-participants.conf" 'canton.participants.extra-1 = $${_participant} {'
assert_file_contains "$tmpdir/generated/additional-config.extra-participants.conf" '  storage.config.properties.databaseName = "participant-extra-3"'
assert_file_contains "$tmpdir/generated/additional-config.extra-participants.conf" '  init {'
assert_file_contains "$tmpdir/generated/additional-config.extra-participants.conf" '    generate-topology-transactions-and-keys = true'
assert_file_contains "$tmpdir/generated/additional-config.extra-participants.conf" '    identity.type = auto'
assert_file_contains "$tmpdir/generated/additional-config.extra-participants.conf" '      type = unsafe-jwt-hmac-256'
assert_file_contains "$tmpdir/generated/additional-config.extra-participants.conf" '    user-management-service.additional-admin-user-id = "${EXTRA_VALIDATOR_1_USER_NAME}"'
assert_file_contains "$tmpdir/generated/additional-config.extra-validators.conf" 'canton.validator-apps.extra-1-validator_backend = $${_validator_backend} {'
assert_file_contains "$tmpdir/generated/additional-config.extra-validators.conf" '  onboarding.secret = "${EXTRA_VALIDATOR_1_ONBOARDING_SECRET}"'
assert_file_contains "$tmpdir/generated/additional-config.extra-validators.conf" '  domain-migration-dump-path = "/domain-upgrade-dump/domain_migration_dump-extra-1.json"'
assert_file_contains "$tmpdir/generated/additional-config.extra-validators.conf" '  storage.config.properties.databaseName = "${EXTRA_VALIDATOR_1_DB}"'
assert_file_contains "$tmpdir/generated/additional-config.extra-validators.conf" '  canton-identifier-config.participant = extra-1'
assert_file_contains "$tmpdir/generated/additional-config.extra-validators.conf" '        type = "self-signed"'
assert_file_contains "$tmpdir/generated/additional-config.extra-validators.conf" '  ledger-api-user = "${EXTRA_VALIDATOR_1_USER_NAME}"'
assert_file_contains "$tmpdir/generated/additional-config.extra-validators.conf" '  validator-wallet-users.0 = "${EXTRA_VALIDATOR_1_WALLET_ADMIN_USER_NAME}"'
assert_file_contains "$tmpdir/generated/additional-config.extra-validators.conf" '  validator-party-hint = "${EXTRA_VALIDATOR_1_PARTY_HINT}"'
assert_file_contains "$tmpdir/generated/additional-config.extra-validators.conf" '  domains.global.buy-extra-traffic {'
assert_file_contains "$tmpdir/generated/additional-config.extra-validators.conf" 'canton.sv-apps.sv.expected-validator-onboardings += { secret = "${EXTRA_VALIDATOR_3_ONBOARDING_SECRET}" }'
run_case $'.PHONY: start\nstart:\n' 'stub env AUTH_MODE=shared-secret' shared-secret default 2 '' '' 0 1
assert_file_contains_text "$tmpdir/generated/additional-config.extra-participants.conf" 'canton.participants.extra-1.ledger-api.tls {'
assert_file_contains_text "$tmpdir/generated/additional-config.extra-validators.conf" 'canton.validator-apps.extra-1-validator_backend.participant-client {'
compose_config="$tmpdir/extra-tls-compose.config"
if [[ -n "$real_docker" ]] && "$real_docker" compose version >/dev/null 2>&1; then
  if ! "$real_docker" compose \
  -f "$tmpdir/quickstart/compose.yaml" \
  -f "$tmpdir/quickstart/docker/modules/localnet/compose.yaml" \
  -f "$tmpdir/quickstart/docker/modules/splice-onboarding/compose.yaml" \
  -f "$tmpdir/quickstart/docker/modules/pqs/compose.yaml" \
  -f "$tmpdir/generated/compose-extra-participants.yaml" \
  -f "$tmpdir/tls/compose-localnet.yaml" \
  --env-file "$tmpdir/quickstart/.env" \
  --env-file "$tmpdir/quickstart/.env.local" \
  --env-file "$tmpdir/generated/extra-participants.env" \
  config > "$compose_config" 2>&1; then
    echo 'extra participants plus TLS did not produce valid merged Compose configuration' >&2
    cat "$compose_config" >&2
    exit 1
  fi
else
  assert_file_contains_text "$tmpdir/generated/compose-extra-participants.yaml" '  postgres-pqs-extra-1:'
  assert_file_contains_text "$tmpdir/generated/compose-extra-participants.yaml" '      postgres-pqs-extra-1:'
fi
run_case $'.PHONY: start-local-ledger\nstart-local-ledger:\n' 'stub docker compose -f compose.yaml -f '"$tmpdir"'/quickstart/docker/modules/localnet/compose.yaml -f '"$tmpdir"'/quickstart/docker/modules/splice-onboarding/compose.yaml -f '"$tmpdir"'/quickstart/docker/modules/pqs/compose.yaml --env-file .env --env-file .env.local --env-file '"$tmpdir"'/quickstart/docker/modules/localnet/compose.env --env-file '"$tmpdir"'/quickstart/docker/modules/localnet/env/common.env --env-file '"$tmpdir"'/quickstart/docker/modules/pqs/compose.env --profile app-provider --profile pqs-app-provider --profile pqs-sv -f '"$tmpdir"'/tls/compose-localnet.yaml down -v --remove-orphans' shared-secret default 0 '' '' 0 1
assert_file_contains_text "$tmpdir/tls/canton-tls.conf" 'canton.participants.app-provider.ledger-api.tls {'
assert_file_contains_text "$tmpdir/tls/canton-tls.conf" 'canton.participants.app-provider.admin-api.tls {'
assert_file_contains_text "$tmpdir/tls/canton-tls.conf" 'canton.participants.sv.admin-api.tls {'
if grep -Fq 'canton.participants.app-user.ledger-api.tls {' "$tmpdir/tls/canton-tls.conf" \
  || grep -Fq 'canton.participants.app-user.admin-api.tls {' "$tmpdir/tls/canton-tls.conf"; then
  echo "unexpected TLS configuration for inactive app-user participant" >&2
  exit 1
fi
assert_file_contains_text "$tmpdir/tls/compose-localnet.yaml" '/app/localnet-tls/server.key:ro'
assert_file_contains_text "$tmpdir/tls/compose-localnet.yaml" '/app/localnet-tls/ca.crt:ro'
assert_file_contains_text "$tmpdir/tls/compose-localnet.yaml" 'ADDITIONAL_CONFIG_LOCALNET_TLS: |'
assert_file_contains_text "$tmpdir/tls/compose-localnet.yaml" 'LOCALNET_HTTP_SCHEME=https'
assert_file_contains_text "$tmpdir/tls/compose-localnet.yaml" 'CURL_CA_BUNDLE=/app/localnet-tls/ca.crt'
assert_file_contains_text "$tmpdir/tls/compose-localnet.yaml" "$tmpdir/tls/splice-onboarding-utils.sh:/app/utils.sh:ro"
assert_file_contains_text "$tmpdir/tls/compose-localnet.yaml" 'admin-api.tls.trust-collection-file = "/app/localnet-tls/ca.crt"'
assert_file_contains_text "$tmpdir/tls/compose-localnet.yaml" 'ledger-api.client-config.tls.trust-collection-file = "/app/localnet-tls/ca.crt"'
assert_file_contains_text "$tmpdir/tls/compose-localnet.yaml" 'SCRIBE_SOURCE_LEDGER_TLS_CAFILE: /app/localnet-tls/ca.crt'
assert_file_contains_text "$tmpdir/tls/splice-onboarding-utils.sh" '${LOCALNET_HTTP_SCHEME:-http}://$participant/v2/users'
assert_file_contains_text "$tmpdir/tls/splice-onboarding-utils.sh" '${LOCALNET_HTTP_SCHEME:-http}://$validator/api/validator/v0/scan-proxy/dso-party-id'
if grep -Fq 'canton.validator-apps.app-user-validator_backend.participant-client' "$tmpdir/tls/compose-localnet.yaml"; then
  echo "unexpected client TLS configuration for inactive app-user participant" >&2
  exit 1
fi
assert_file_mode "$tmpdir/tls/server.key" 644
assert_file_mode "$tmpdir/tls/ca.key" 600
if ! openssl x509 -in "$tmpdir/tls/server.crt" -text -noout \
  | grep -Fq 'IP Address:127.0.0.1, IP Address:0.0.0.0'; then
  echo 'generated TLS certificate is missing the 0.0.0.0 subject alternative name' >&2
  openssl x509 -in "$tmpdir/tls/server.crt" -text -noout >&2
  exit 1
fi
run_case $'.PHONY: start\nstart:\n' 'stub docker compose -f compose.yaml -f '"$tmpdir"'/quickstart/docker/modules/localnet/compose.yaml -f '"$tmpdir"'/quickstart/docker/modules/splice-onboarding/compose.yaml -f '"$tmpdir"'/quickstart/docker/modules/pqs/compose.yaml --env-file .env --env-file .env.local --env-file '"$tmpdir"'/quickstart/docker/modules/localnet/compose.env --env-file '"$tmpdir"'/quickstart/docker/modules/localnet/env/common.env --env-file '"$tmpdir"'/quickstart/docker/modules/pqs/compose.env --profile app-provider --profile pqs-app-provider --profile pqs-sv -f '"$tmpdir"'/generated/compose-extra-participants.yaml --env-file '"$tmpdir"'/generated/extra-participants.env -f '"$tmpdir"'/tls/compose-localnet.yaml down -v --remove-orphans' shared-secret default 2 '' '' 0 1
assert_file_contains_text "$tmpdir/generated/additional-config.extra-participants.conf" 'canton.participants.extra-1.ledger-api.tls {'
assert_file_contains_text "$tmpdir/generated/additional-config.extra-participants.conf" 'canton.participants.extra-2.admin-api.tls {'
assert_file_contains_text "$tmpdir/generated/additional-config.extra-validators.conf" 'canton.validator-apps.extra-1-validator_backend.participant-client {'
assert_file_contains_text "$tmpdir/generated/additional-config.extra-validators.conf" 'admin-api.tls.trust-collection-file = "/app/localnet-tls/ca.crt"'
assert_file_contains_text "$tmpdir/generated/compose-extra-participants.yaml" 'SCRIBE_SOURCE_LEDGER_TLS_CAFILE: /app/localnet-tls/ca.crt'

mkdir -p "$tmpdir/supplied"
openssl genrsa -out "$tmpdir/supplied/ca.key" 2048 >/dev/null 2>&1
openssl req -x509 -new -sha256 -days 3650 \
  -key "$tmpdir/supplied/ca.key" \
  -subj '/CN=supplied-localnet-ca' \
  -addext 'basicConstraints=critical,CA:TRUE' \
  -addext 'keyUsage=critical,keyCertSign,cRLSign' \
  -out "$tmpdir/supplied/ca.crt" >/dev/null 2>&1
openssl genrsa -out "$tmpdir/supplied/server.key" 2048 >/dev/null 2>&1
openssl req -new -sha256 -key "$tmpdir/supplied/server.key" \
  -subj '/CN=localhost' -out "$tmpdir/supplied/server.csr" >/dev/null 2>&1
printf '%s\n' \
  '[server_ext]' \
  'basicConstraints = CA:FALSE' \
  'keyUsage = digitalSignature, keyEncipherment' \
  'extendedKeyUsage = serverAuth' \
  'subjectAltName = DNS:localhost, DNS:canton, IP:127.0.0.1' \
  > "$tmpdir/supplied/server-extensions.cnf"
openssl x509 -req -sha256 -days 3650 \
  -in "$tmpdir/supplied/server.csr" \
  -CA "$tmpdir/supplied/ca.crt" -CAkey "$tmpdir/supplied/ca.key" -CAcreateserial \
  -out "$tmpdir/supplied/server.crt" \
  -extfile "$tmpdir/supplied/server-extensions.cnf" -extensions server_ext >/dev/null 2>&1
run_case $'.PHONY: start\nstart:\n' 'stub docker compose -f compose.yaml -f '"$tmpdir"'/quickstart/docker/modules/localnet/compose.yaml -f '"$tmpdir"'/quickstart/docker/modules/splice-onboarding/compose.yaml -f '"$tmpdir"'/quickstart/docker/modules/pqs/compose.yaml --env-file .env --env-file .env.local --env-file '"$tmpdir"'/quickstart/docker/modules/localnet/compose.env --env-file '"$tmpdir"'/quickstart/docker/modules/localnet/env/common.env --env-file '"$tmpdir"'/quickstart/docker/modules/pqs/compose.env --profile app-provider --profile pqs-app-provider --profile pqs-sv -f '"$tmpdir"'/tls/compose-localnet.yaml down -v --remove-orphans' shared-secret default 0 '' '' 0 1 "$tmpdir/supplied/server.crt" "$tmpdir/supplied/server.key" "$tmpdir/supplied/ca.crt"
if [[ ! -e "$tmpdir/tls/server.key" || -e "$tmpdir/tls/ca.key" ]]; then
  echo 'supplied TLS mode did not stage the container-readable key correctly' >&2
  exit 1
fi
assert_file_mode "$tmpdir/tls/server.key" 644
assert_file_contains_text "$tmpdir/tls/compose-localnet.yaml" "$tmpdir/tls/server.key:/app/localnet-tls/server.key:ro"
openssl genrsa -out "$tmpdir/supplied/mismatch.key" 2048 >/dev/null 2>&1
run_case $'.PHONY: start\nstart:\n' 'Supplied TLS private key does not match the server certificate.' shared-secret default 0 '' '' 0 1 "$tmpdir/supplied/server.crt" "$tmpdir/supplied/mismatch.key" "$tmpdir/supplied/ca.crt" 1
run_case $'.PHONY: start\nstart:\n' 'LOCALNET_TLS_CERT_CHAIN_PATH, LOCALNET_TLS_PRIVATE_KEY_PATH, and LOCALNET_TLS_CA_CERT_PATH must be set together.' shared-secret default 0 '' '' 0 1 "$tmpdir/supplied/server.crt" '' '' 1
run_case $'.PHONY: start\nstart:\n' 'LOCALNET_TLS must be 0 or 1.' shared-secret default 0 '' '' 0 invalid '' '' '' 1
run_case $'.PHONY: start\nstart:\n' 'ES256 bearer token written to '"$tmpdir"'/es256/ledger-api-user.token' shared-secret default 0 '' '' 1 1
assert_file_contains_text "$tmpdir/es256/canton-es256.conf" 'include file("/app/localnet-tls.conf")'
assert_file_contains_text "$tmpdir/es256/compose-es256.yaml" '/app/es256-certificate.pem:ro'
assert_file_contains_text "$tmpdir/tls/compose-localnet.yaml" '/app/localnet-tls/server.crt:ro'
run_case $'.PHONY: start\nstart:\n' 'stub docker compose -f compose.yaml -f '"$tmpdir"'/quickstart/docker/modules/localnet/compose.yaml -f '"$tmpdir"'/quickstart/docker/modules/splice-onboarding/compose.yaml -f '"$tmpdir"'/quickstart/docker/modules/pqs/compose.yaml --env-file .env --env-file .env.local --env-file '"$tmpdir"'/quickstart/docker/modules/localnet/compose.env --env-file '"$tmpdir"'/quickstart/docker/modules/localnet/env/common.env --env-file '"$tmpdir"'/quickstart/docker/modules/pqs/compose.env --profile app-provider --profile pqs-app-provider --profile pqs-sv -f '"$tmpdir"'/generated/compose-extra-participants.yaml --env-file '"$tmpdir"'/generated/extra-participants.env -f '"$tmpdir"'/tls/compose-localnet.yaml -f '"$tmpdir"'/es256/compose-es256.yaml up -d --no-recreate --no-deps splice' shared-secret default 3 '' '' 1 1
exact_compose_config="$tmpdir/exact-compose.config"
if [[ -n "$real_docker" ]] && "$real_docker" compose version >/dev/null 2>&1; then
  if ! "$real_docker" compose \
    -f "$tmpdir/quickstart/compose.yaml" \
    -f "$tmpdir/quickstart/docker/modules/localnet/compose.yaml" \
    -f "$tmpdir/quickstart/docker/modules/splice-onboarding/compose.yaml" \
    -f "$tmpdir/quickstart/docker/modules/pqs/compose.yaml" \
    -f "$tmpdir/generated/compose-extra-participants.yaml" \
    -f "$tmpdir/tls/compose-localnet.yaml" \
    -f "$tmpdir/es256/compose-es256.yaml" \
    --env-file "$tmpdir/quickstart/.env" \
    --env-file "$tmpdir/quickstart/.env.local" \
    --env-file "$tmpdir/generated/extra-participants.env" \
    config > "$exact_compose_config" 2>&1; then
    echo 'three extra participants plus TLS and ES256 did not produce valid merged Compose configuration' >&2
    cat "$exact_compose_config" >&2
    exit 1
  fi
fi
run_repo_root_env_case
