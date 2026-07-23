#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
DOCKER_COMPOSE_CMD=()

load_repo_root_env() {
  local env_file="$REPO_ROOT/.env"
  if [[ -f "$env_file" ]]; then
    local existing_cn_quickstart_dir="${CN_QUICKSTART_DIR:-}"
    set -a
    # shellcheck disable=SC1090
    source "$env_file"
    set +a
    if [[ -n "$existing_cn_quickstart_dir" ]]; then
      CN_QUICKSTART_DIR="$existing_cn_quickstart_dir"
    fi
  fi
}

normalize_quickstart_dir_candidate() {
  local candidate="$1"

  if [[ -z "$candidate" ]]; then
    return 1
  fi

  if [[ -d "$candidate/quickstart" ]]; then
    candidate="$candidate/quickstart"
  fi

  if [[ -f "$candidate/compose.yaml" && -d "$candidate/docker/modules" ]]; then
    cd -- "$candidate" && pwd
    return 0
  fi

  return 1
}

resolve_quickstart_dir() {
  local candidate
  for candidate in \
    "${CN_QUICKSTART_DIR:-}" \
    "$SCRIPT_DIR/../cn-quickstart/quickstart" \
    "$SCRIPT_DIR/../../cn-quickstart/quickstart"
  do
    if normalize_quickstart_dir_candidate "$candidate"; then
      return 0
    fi
  done

  echo "Unable to locate CN Quickstart. Set CN_QUICKSTART_DIR in $REPO_ROOT/.env or place the checkout in a supported location." >&2
  return 1
}

make_target_exists() {
  local target="$1"
  make -qp 2>/dev/null | grep -Eq "^${target}:"
}

read_env_value_from_files() {
  local key="$1"
  shift

  local file
  for file in "$@"; do
    if [[ -f "$file" ]]; then
      local line
      line="$(grep -E "^${key}=" "$file" | tail -n 1 || true)"
      if [[ -n "$line" ]]; then
        printf '%s\n' "${line#*=}"
        return 0
      fi
    fi
  done
  return 1
}

read_env_value() {
  read_env_value_from_files "$1" .env.local .env
}

generated_dir() {
  printf '%s\n' "${START_LOCAL_GENERATED_DIR:-$SCRIPT_DIR/.generated/start-local}"
}

resolve_docker_compose_cmd() {
  if (( ${#DOCKER_COMPOSE_CMD[@]} > 0 )); then
    return 0
  fi

  if docker compose version >/dev/null 2>&1; then
    DOCKER_COMPOSE_CMD=(docker compose)
    return 0
  fi

  if docker-compose version >/dev/null 2>&1; then
    DOCKER_COMPOSE_CMD=(docker-compose)
    return 0
  fi

  echo "Unable to find a working Docker Compose command. Install 'docker compose' or 'docker-compose'." >&2
  return 1
}

docker_compose() {
  resolve_docker_compose_cmd
  "${DOCKER_COMPOSE_CMD[@]}" "$@"
}

resolve_extra_participants() {
  local value="${EXTRA_PARTICIPANTS:-0}"
  if [[ ! "$value" =~ ^[0-9]+$ ]]; then
    echo "EXTRA_PARTICIPANTS must be a non-negative integer." >&2
    return 1
  fi
  if [[ "$value" == "0" ]]; then
    printf '0\n'
    return 0
  fi
  printf '%s\n' "$value"
}

load_localnet_common_env() {
  local common_env_file="$1"
  set -a
  # shellcheck disable=SC1090
  source "$common_env_file"
  set +a
  PARTICIPANT_LEDGER_API_PORT_SUFFIX="${PARTICIPANT_LEDGER_API_PORT_SUFFIX:-901}"
  PARTICIPANT_ADMIN_API_PORT_SUFFIX="${PARTICIPANT_ADMIN_API_PORT_SUFFIX:-902}"
  PARTICIPANT_JSON_API_PORT_SUFFIX="${PARTICIPANT_JSON_API_PORT_SUFFIX:-975}"
  VALIDATOR_ADMIN_API_PORT_SUFFIX="${VALIDATOR_ADMIN_API_PORT_SUFFIX:-903}"
  CANTON_HTTP_HEALTHCHECK_PORT_SUFFIX="${CANTON_HTTP_HEALTHCHECK_PORT_SUFFIX:-900}"
  CANTON_GRPC_HEALTHCHECK_PORT_SUFFIX="${CANTON_GRPC_HEALTHCHECK_PORT_SUFFIX:-961}"
}

participant_port() {
  local prefix="$1"
  local suffix="$2"
  printf '%s%s\n' "$prefix" "$suffix"
}

published_port() {
  local container_port="$1"
  local test_port
  test_port="${TEST_PORT:-$(read_env_value TEST_PORT || true)}"
  if [[ -n "$test_port" ]]; then
    printf '%s%s\n' "$test_port" "$container_port"
    return 0
  fi
  printf '%s\n' "$container_port"
}

extra_pqs_postgres_port() {
  local index="$1"
  printf '554%s\n' "$index"
}

resolve_party_hint_base() {
  local compose_env_file="$1"

  (
    set -a
    if [[ -f .env ]]; then
      # shellcheck disable=SC1091
      source .env
    fi
    if [[ -f .env.local ]]; then
      # shellcheck disable=SC1091
      source .env.local
    fi
    # shellcheck disable=SC1090
    source "$compose_env_file"
    set +a
    printf '%s\n' "${PARTY_HINT:-${DOCKER_NETWORK:-localnet}-localparty-1}"
  )
}

write_extra_participant_runtime_files() {
  local count="$1"
  local output_dir="$2"
  local party_hint_base="$3"
  local auth_mode="$4"
  mkdir -p "$output_dir"

  local env_file="$output_dir/extra-participants.env"
  local canton_config_file="$output_dir/additional-config.extra-participants.conf"
  local splice_config_file="$output_dir/additional-config.extra-validators.conf"
  local compose_file="$output_dir/compose-extra-participants.yaml"

  {
    printf 'START_LOCAL_GENERATED_DIR=%s\n' "$output_dir"
    local index
    for ((index = 1; index <= count; index++)); do
      local prefix=$((index + 4))
      local name="extra-${index}"
      local database="participant-${name}"
      local party_hint="extra_${index}_${party_hint_base}"
      local pqs_database="pqs-${name}"
      local pqs_name="pqs-${name}"
      local pqs_user_name="${name}-pqs-user"
      local pqs_postgres_name="postgres-pqs-${name}"
      local pqs_postgres_published_port
      local validator_database="validator-${name}"
      local validator_party_hint="validator_${index}_${party_hint_base}"
      local validator_onboarding_secret="${name}-validator-onboarding-secret"
      local validator_user_name="ledger-api-user"
      local wallet_admin_user_name="$name"
      local auth_audience="https://canton.network.global"
      local ledger_port admin_port json_port validator_admin_port http_health_port grpc_health_port
      local published_ledger_port published_admin_port published_json_port published_validator_admin_port
      ledger_port="$(participant_port "$prefix" "$PARTICIPANT_LEDGER_API_PORT_SUFFIX")"
      admin_port="$(participant_port "$prefix" "$PARTICIPANT_ADMIN_API_PORT_SUFFIX")"
      json_port="$(participant_port "$prefix" "$PARTICIPANT_JSON_API_PORT_SUFFIX")"
      validator_admin_port="$(participant_port "$prefix" "$VALIDATOR_ADMIN_API_PORT_SUFFIX")"
      http_health_port="$(participant_port "$prefix" "$CANTON_HTTP_HEALTHCHECK_PORT_SUFFIX")"
      grpc_health_port="$(participant_port "$prefix" "$CANTON_GRPC_HEALTHCHECK_PORT_SUFFIX")"
      pqs_postgres_published_port="$(extra_pqs_postgres_port "$index")"
      published_ledger_port="$(published_port "$ledger_port")"
      published_admin_port="$(published_port "$admin_port")"
      published_json_port="$(published_port "$json_port")"
      published_validator_admin_port="$(published_port "$validator_admin_port")"

      printf 'CREATE_DATABASE_EXTRA_%s=%s\n' "$index" "$database"
      printf 'CREATE_DATABASE_EXTRA_VALIDATOR_%s=%s\n' "$index" "$validator_database"
      printf 'CREATE_DATABASE_EXTRA_PQS_%s=%s\n' "$index" "$pqs_database"
      printf 'EXTRA_PARTICIPANT_%s_NAME=%s\n' "$index" "$name"
      printf 'EXTRA_PARTICIPANT_%s_DB=%s\n' "$index" "$database"
      printf 'EXTRA_PARTICIPANT_%s_PARTY_HINT=%s\n' "$index" "$party_hint"
      printf 'EXTRA_PARTICIPANT_%s_LEDGER_API_PORT=%s\n' "$index" "$ledger_port"
      printf 'EXTRA_PARTICIPANT_%s_ADMIN_API_PORT=%s\n' "$index" "$admin_port"
      printf 'EXTRA_PARTICIPANT_%s_JSON_API_PORT=%s\n' "$index" "$json_port"
      printf 'EXTRA_PARTICIPANT_%s_HTTP_HEALTHCHECK_PORT=%s\n' "$index" "$http_health_port"
      printf 'EXTRA_PARTICIPANT_%s_GRPC_HEALTHCHECK_PORT=%s\n' "$index" "$grpc_health_port"
      printf 'EXTRA_PARTICIPANT_%s_LEDGER_API_PUBLISHED_PORT=%s\n' "$index" "$published_ledger_port"
      printf 'EXTRA_PARTICIPANT_%s_ADMIN_API_PUBLISHED_PORT=%s\n' "$index" "$published_admin_port"
      printf 'EXTRA_PARTICIPANT_%s_JSON_API_PUBLISHED_PORT=%s\n' "$index" "$published_json_port"
      printf 'EXTRA_VALIDATOR_%s_DB=%s\n' "$index" "$validator_database"
      printf 'EXTRA_VALIDATOR_%s_PARTY_HINT=%s\n' "$index" "$validator_party_hint"
      printf 'EXTRA_VALIDATOR_%s_ONBOARDING_SECRET=%s\n' "$index" "$validator_onboarding_secret"
      printf 'EXTRA_VALIDATOR_%s_ADMIN_API_PORT=%s\n' "$index" "$validator_admin_port"
      printf 'EXTRA_VALIDATOR_%s_ADMIN_API_PUBLISHED_PORT=%s\n' "$index" "$published_validator_admin_port"
      printf 'EXTRA_VALIDATOR_%s_USER_NAME=%s\n' "$index" "$validator_user_name"
      printf 'EXTRA_VALIDATOR_%s_WALLET_ADMIN_USER_NAME=%s\n' "$index" "$wallet_admin_user_name"
      printf 'EXTRA_VALIDATOR_%s_AUTH_AUDIENCE=%s\n' "$index" "$auth_audience"
      printf 'EXTRA_VALIDATOR_%s_AUTH_MODE=%s\n' "$index" "$auth_mode"
      printf 'EXTRA_PQS_%s_NAME=%s\n' "$index" "$pqs_name"
      printf 'EXTRA_PQS_%s_USER_NAME=%s\n' "$index" "$pqs_user_name"
      printf 'EXTRA_PQS_%s_POSTGRES_NAME=%s\n' "$index" "$pqs_postgres_name"
      printf 'EXTRA_PQS_%s_POSTGRES_DB=%s\n' "$index" "$pqs_database"
      printf 'EXTRA_PQS_%s_POSTGRES_PUBLISHED_PORT=%s\n' "$index" "$pqs_postgres_published_port"
      printf 'EXTRA_PQS_%s_CONFIG_FILE=%s-pqs.conf\n' "$index" "$name"
    done
  } > "$env_file"

  {
    local index
    for ((index = 1; index <= count; index++)); do
      cat <<EOF
canton.participants.extra-${index} = \$\${_participant} {
  storage.config.properties.databaseName = "participant-extra-${index}"
  init {
    generate-topology-transactions-and-keys = true
    identity.type = auto
  }
  monitoring {
    http-health-server.port = \${EXTRA_PARTICIPANT_${index}_HTTP_HEALTHCHECK_PORT}
    grpc-health-server.port = \${EXTRA_PARTICIPANT_${index}_GRPC_HEALTHCHECK_PORT}
  }
  http-ledger-api.port = \${EXTRA_PARTICIPANT_${index}_JSON_API_PORT}
  admin-api.port = \${EXTRA_PARTICIPANT_${index}_ADMIN_API_PORT}
  ledger-api.port = \${EXTRA_PARTICIPANT_${index}_LEDGER_API_PORT}
  ledger-api {
    auth-services = [{
      type = unsafe-jwt-hmac-256
      target-audience = "\${EXTRA_VALIDATOR_${index}_AUTH_AUDIENCE}"
      secret = "unsafe"
    }]

    user-management-service.additional-admin-user-id = "\${EXTRA_VALIDATOR_${index}_USER_NAME}"
  }
}

EOF
    done
  } > "$canton_config_file"

  {
    local index
    for ((index = 1; index <= count; index++)); do
      local validator_backend_ref='$${_validator_backend}'
      cat <<EOF
canton.validator-apps.extra-${index}-validator_backend = ${validator_backend_ref} {
  onboarding.secret = "\${EXTRA_VALIDATOR_${index}_ONBOARDING_SECRET}"
  domain-migration-dump-path = "/domain-upgrade-dump/domain_migration_dump-extra-${index}.json"
  storage.config.properties.databaseName = "\${EXTRA_VALIDATOR_${index}_DB}"
  admin-api.port = \${EXTRA_VALIDATOR_${index}_ADMIN_API_PORT}
  canton-identifier-config.participant = extra-${index}
  participant-client {
    admin-api.port = \${EXTRA_PARTICIPANT_${index}_ADMIN_API_PORT}
    ledger-api {
      client-config.port = \${EXTRA_PARTICIPANT_${index}_LEDGER_API_PORT}
      auth-config = {
        type = "self-signed"
        user = "\${EXTRA_VALIDATOR_${index}_USER_NAME}"
        audience = "\${EXTRA_VALIDATOR_${index}_AUTH_AUDIENCE}"
        secret = "unsafe"
      }
    }
  }
  auth = {
    algorithm = "hs-256-unsafe"
    audience = "\${EXTRA_VALIDATOR_${index}_AUTH_AUDIENCE}"
    secret = "unsafe"
  }
  ledger-api-user = "\${EXTRA_VALIDATOR_${index}_USER_NAME}"
  validator-wallet-users.0 = "\${EXTRA_VALIDATOR_${index}_WALLET_ADMIN_USER_NAME}"
  validator-party-hint = "\${EXTRA_VALIDATOR_${index}_PARTY_HINT}"

  domains.global.buy-extra-traffic {
    min-topup-interval = \${?MIN_TRAFFIC_TOPUP_INTERVAL}
    target-throughput = \${?TARGET_TRAFFIC_THROUGHPUT}
  }
}

canton.sv-apps.sv.expected-validator-onboardings += { secret = "\${EXTRA_VALIDATOR_${index}_ONBOARDING_SECRET}" }

EOF
    done
  } > "$splice_config_file"

  {
    cat <<'EOF'
volumes:
EOF
    local index
    for ((index = 1; index <= count; index++)); do
      cat <<EOF
  postgres-pqs-extra-${index}:
EOF
    done
    cat <<'EOF'

services:
  postgres:
    env_file:
      - ${START_LOCAL_GENERATED_DIR}/extra-participants.env
  canton:
    env_file:
      - ${START_LOCAL_GENERATED_DIR}/extra-participants.env
    environment:
      ADDITIONAL_CONFIG_EXTRA_PARTICIPANTS: |
EOF
    sed 's/^/        /' "$canton_config_file"
    cat <<'EOF'
    ports:
EOF
    for ((index = 1; index <= count; index++)); do
      cat <<EOF
      - "\${EXTRA_PARTICIPANT_${index}_LEDGER_API_PUBLISHED_PORT}:\${EXTRA_PARTICIPANT_${index}_LEDGER_API_PORT}"
      - "\${EXTRA_PARTICIPANT_${index}_ADMIN_API_PUBLISHED_PORT}:\${EXTRA_PARTICIPANT_${index}_ADMIN_API_PORT}"
      - "\${EXTRA_PARTICIPANT_${index}_JSON_API_PUBLISHED_PORT}:\${EXTRA_PARTICIPANT_${index}_JSON_API_PORT}"
EOF
    done
    cat <<'EOF'
  splice:
    env_file:
      - ${START_LOCAL_GENERATED_DIR}/extra-participants.env
    environment:
      ADDITIONAL_CONFIG_EXTRA_VALIDATORS: |
EOF
    sed -e 's/\${?/\$\${?/g' -e 's/^/        /' "$splice_config_file"
    cat <<'EOF'
    ports:
EOF
    for ((index = 1; index <= count; index++)); do
      cat <<EOF
      - "\${EXTRA_VALIDATOR_${index}_ADMIN_API_PUBLISHED_PORT}:\${EXTRA_VALIDATOR_${index}_ADMIN_API_PORT}"
EOF
    done
    for ((index = 1; index <= count; index++)); do
      cat <<EOF
  postgres-pqs-extra-${index}:
    image: "postgres:\${POSTGRES_VERSION}"
    container_name: postgres-pqs-extra-${index}
    volumes:
      - postgres-pqs-extra-${index}:/var/lib/postgresql/data
      - \${LOCALNET_DIR}/docker/postgres/postgres-entrypoint.sh:/postgres-entrypoint.sh
    environment:
      POSTGRES_USER: \${DB_USER}
      POSTGRES_PASSWORD: \${DB_PASSWORD}
      POSTGRES_DB: postgres
      CREATE_DATABASE_EXTRA_PQS_${index}: \${EXTRA_PQS_${index}_POSTGRES_DB}
    ports:
      - "\${EXTRA_PQS_${index}_POSTGRES_PUBLISHED_PORT}:5432"
    entrypoint: /postgres-entrypoint.sh
    healthcheck:
      test: "pg_isready -U \${DB_USER} -d postgres"
      interval: 10s
      timeout: 3s
      retries: 3
      start_period: 30s
    user: "postgres"
    command:
      - postgres
      - -c
      - max_connections=1000
  pqs-extra-${index}:
    image: \${SCRIBE_IMAGE}:\${SCRIBE_VERSION}
    container_name: pqs-extra-${index}
    environment:
      SCRIBE_SOURCE_LEDGER_HOST: canton
      SCRIBE_SOURCE_LEDGER_PORT: \${EXTRA_PARTICIPANT_${index}_LEDGER_API_PORT}
      SCRIBE_SOURCE_LEDGER_AUTH: OAuth
      SCRIBE_TARGET_POSTGRES_HOST: postgres-pqs-extra-${index}
      SCRIBE_TARGET_POSTGRES_PORT: 5432
      SCRIBE_TARGET_POSTGRES_DATABASE: \${EXTRA_PQS_${index}_POSTGRES_DB}
      SCRIBE_TARGET_POSTGRES_USERNAME: \${DB_USER}
      SCRIBE_TARGET_POSTGRES_PASSWORD: \${DB_PASSWORD}
      SCRIBE_CONFIG: /onboarding/extra-${index}-pqs.conf
    volumes:
      - onboarding:/onboarding
    command:
      - pipeline
      - ledger
      - postgres-document
    depends_on:
      canton:
        condition: service_healthy
      splice-onboarding:
        condition: service_healthy
      postgres-pqs-extra-${index}:
        condition: service_healthy
    restart: on-failure:100
EOF
    done
  } > "$compose_file"
}

append_extra_participant_args() {
  local count="$1"
  local auth_mode="$2"
  local -n compose_args_ref="$3"
  local output_dir
  output_dir="$(generated_dir)"

  if (( count == 0 )); then
    rm -rf "$output_dir"
    return 0
  fi

  write_extra_participant_runtime_files "$count" "$output_dir" "$PARTY_HINT_BASE" "$auth_mode"
  compose_args_ref+=(
    -f "$output_dir/compose-extra-participants.yaml"
    --env-file "$output_dir/extra-participants.env"
  )
}

extra_participants_healthy() {
  local count="$1"
  if (( count == 0 )); then
    return 0
  fi

  local checks=()
  local index
  for ((index = 1; index <= count; index++)); do
    local prefix=$((index + 4))
    local health_port
    health_port="$(participant_port "$prefix" "$CANTON_HTTP_HEALTHCHECK_PORT_SUFFIX")"
    checks+=("curl -sf --max-time 2 http://localhost:${health_port}/health > /dev/null")
  done

  local joined_checks
  joined_checks="$(printf '%s && ' "${checks[@]}")"
  joined_checks="${joined_checks% && }"
  docker exec canton bash -lc "$joined_checks" >/dev/null 2>&1
}

prerequisite_services() {
  local auth_mode="$1"
  local services=(postgres canton)
  if [[ "$auth_mode" == "oauth2" ]]; then
    services=(keycloak nginx-keycloak "${services[@]}")
  fi
  printf '%s\n' "${services[@]}"
}

dependent_services() {
  printf '%s\n' splice splice-onboarding pqs-app-provider pqs-sv
}

extra_pqs_services() {
  local count="$1"
  local index
  for ((index = 1; index <= count; index++)); do
    printf 'pqs-extra-%s\n' "$index"
  done
}

wait_for_container_health() {
  local container="$1"
  local attempts="${2:-30}"
  local delay_seconds="${3:-2}"
  local status

  for ((i = 1; i <= attempts; i++)); do
    status="$(docker inspect --format '{{.State.Health.Status}}' "$container" 2>/dev/null | tail -n 1 || true)"
    if [[ "$status" == "healthy" ]]; then
      return 0
    fi
    sleep "$delay_seconds"
  done

  echo "$container did not become healthy after $((attempts * delay_seconds)) seconds." >&2
  return 1
}

wait_for_canton_health() {
  local extra_participants="${1:-0}"
  local attempts=30
  local delay_seconds=2
  local status

  for ((i = 1; i <= attempts; i++)); do
    status="$(docker inspect --format '{{.State.Health.Status}}' canton 2>/dev/null | tail -n 1 || true)"
    if [[ "$status" == "healthy" ]] && extra_participants_healthy "$extra_participants"; then
      return 0
    fi
    sleep "$delay_seconds"
  done

  echo "canton did not become healthy after $((attempts * delay_seconds)) seconds." >&2
  return 1
}

provision_extra_pqs() {
  local count="$1"
  if (( count == 0 )); then
    return 0
  fi

  local index
  for ((index = 1; index <= count; index++)); do
    local name="extra-${index}"
    local json_port
    json_port="$(published_port "$(participant_port "$((index + 4))" "$PARTICIPANT_JSON_API_PORT_SUFFIX")")"

    docker exec \
      -e EXTRA_PARTICIPANT_NAME="$name" \
      -e EXTRA_PARTICIPANT_JSON_API_PORT="$json_port" \
      -e EXTRA_PARTICIPANT_PARTY_HINT="extra_${index}_${PARTY_HINT_BASE}" \
      -e EXTRA_PQS_USER_NAME="${name}-pqs-user" \
      -e EXTRA_PQS_CONFIG_FILE="${name}-pqs.conf" \
      splice-onboarding \
      bash -lc '
set -euo pipefail
source /app/utils.sh
participant="canton:${EXTRA_PARTICIPANT_JSON_API_PORT}"
admin_token="$(generate_jwt "participant_admin" "$AUTH_APP_PROVIDER_AUDIENCE")"
party="$(allocate_party "$admin_token" "$EXTRA_PARTICIPANT_PARTY_HINT" "$participant")"
create_user "$admin_token" "$EXTRA_PQS_USER_NAME" "$EXTRA_PQS_USER_NAME" "$party" "$participant"
grant_rights "$admin_token" "$EXTRA_PQS_USER_NAME" "$party" "ReadAs" "$participant"
pqs_user_token="$(generate_jwt "$EXTRA_PQS_USER_NAME" "$AUTH_APP_PROVIDER_AUDIENCE")"
share_file "$EXTRA_PQS_CONFIG_FILE" <<EOF
pipeline.datasource=TransactionTreeStream
pipeline.ledger.start=Oldest
pipeline.oauth.accessToken="${pqs_user_token}"
EOF
'

    grant_user_read_as_any_party_right \
      "${name}-pqs-user" \
      "https://canton.network.global" \
      "$json_port"
  done
}

grant_validator_read_as_any_party_right() {
  local validator_user_name="$1"
  local auth_audience="$2"
  local participant_json_port="$3"

  docker exec \
    -e VALIDATOR_USER_NAME="$validator_user_name" \
    -e VALIDATOR_AUTH_AUDIENCE="$auth_audience" \
    -e PARTICIPANT_JSON_API_PORT="$participant_json_port" \
    splice-onboarding \
    bash -lc '
set -euo pipefail
source /app/utils.sh
participant="canton:${PARTICIPANT_JSON_API_PORT}"
validator_token="$(generate_jwt "$VALIDATOR_USER_NAME" "$VALIDATOR_AUTH_AUDIENCE")"
payload="$(cat <<EOF
{
  "userId": "${VALIDATOR_USER_NAME}",
  "identityProviderId": "",
  "rights": [
    {"kind":{"CanReadAsAnyParty":{"value":{}}}}
  ]
}
EOF
)"
curl_check "http://$participant/v2/users/$VALIDATOR_USER_NAME/rights" "$validator_token" "application/json" \
  --data-raw "$payload" >/dev/null
'
}

grant_user_read_as_any_party_right() {
  local user_name="$1"
  local auth_audience="$2"
  local participant_json_port="$3"

  docker exec \
    -e TARGET_USER_NAME="$user_name" \
    -e TARGET_AUTH_AUDIENCE="$auth_audience" \
    -e PARTICIPANT_JSON_API_PORT="$participant_json_port" \
    splice-onboarding \
    bash -lc '
set -euo pipefail
source /app/utils.sh
participant="canton:${PARTICIPANT_JSON_API_PORT}"
admin_token="$(generate_jwt "participant_admin" "$TARGET_AUTH_AUDIENCE")"
payload="$(cat <<EOF
{
  "userId": "${TARGET_USER_NAME}",
  "identityProviderId": "",
  "rights": [
    {"kind":{"CanReadAsAnyParty":{"value":{}}}}
  ]
}
EOF
)"
curl_check "http://$participant/v2/users/$TARGET_USER_NAME/rights" "$admin_token" "application/json" \
  --data-raw "$payload" >/dev/null
'
}

grant_localnet_validator_read_rights() {
  local extra_participants="${1:-0}"
  local validator_user_name="ledger-api-user"
  local auth_audience="https://canton.network.global"

  grant_validator_read_as_any_party_right \
    "$validator_user_name" \
    "$auth_audience" \
    "$(published_port "$(participant_port 3 "$PARTICIPANT_JSON_API_PORT_SUFFIX")")"

  grant_validator_read_as_any_party_right \
    "$validator_user_name" \
    "$auth_audience" \
    "$(published_port "$(participant_port 4 "$PARTICIPANT_JSON_API_PORT_SUFFIX")")"

  local index
  for ((index = 1; index <= extra_participants; index++)); do
    grant_validator_read_as_any_party_right \
      "$validator_user_name" \
      "$auth_audience" \
      "$(published_port "$(participant_port "$((index + 4))" "$PARTICIPANT_JSON_API_PORT_SUFFIX")")"
  done
}

start_ledger_stack() {
  local auth_mode="${1:-shared-secret}"
  local modules_dir="$QUICKSTART_DIR/docker/modules"
  local localnet_dir="$modules_dir/localnet"
  local splice_version
  splice_version="$(read_env_value SPLICE_VERSION || true)"
  export MODULES_DIR="$modules_dir"
  export LOCALNET_DIR="$localnet_dir"
  export LOCALNET_ENV_DIR="$localnet_dir/env"
  export IMAGE_TAG="${IMAGE_TAG:-$splice_version}"
  export APP_PROVIDER_PROFILE=on
  export APP_USER_PROFILE=off
  export SV_PROFILE=on
  export PQS_SV_PROFILE=on
  load_localnet_common_env "$localnet_dir/env/common.env"
  local extra_participants
  extra_participants="$(resolve_extra_participants)"
  if (( extra_participants > 0 )) && [[ "$auth_mode" != "shared-secret" ]]; then
    echo "EXTRA_PARTICIPANTS with extra PQS currently supports AUTH_MODE=shared-secret only." >&2
    return 1
  fi
  PARTY_HINT_BASE="$(resolve_party_hint_base "$localnet_dir/compose.env")"
  export PARTY_HINT_BASE
  local compose_args=(
    -f compose.yaml
    -f "$localnet_dir/compose.yaml"
    -f "$modules_dir/splice-onboarding/compose.yaml"
    -f "$modules_dir/pqs/compose.yaml"
    --env-file .env
    --env-file .env.local
    --env-file "$localnet_dir/compose.env"
    --env-file "$localnet_dir/env/common.env"
    --env-file "$modules_dir/pqs/compose.env"
    --profile app-provider
    --profile pqs-app-provider
    --profile pqs-sv
  )

  if [[ "$auth_mode" == "oauth2" ]]; then
    compose_args+=(
      -f "$modules_dir/keycloak/compose.yaml"
      --env-file "$modules_dir/keycloak/compose.env"
      --profile keycloak
    )
  fi

  append_extra_participant_args "$extra_participants" "$auth_mode" compose_args
  docker_compose "${compose_args[@]}" down -v --remove-orphans
  mapfile -t startup_services < <(prerequisite_services "$auth_mode")
  mapfile -t followup_services < <(dependent_services)

  docker_compose "${compose_args[@]}" up -d --no-recreate "${startup_services[@]}"
  wait_for_canton_health "$extra_participants"

  docker_compose "${compose_args[@]}" up -d --no-recreate "${followup_services[@]}"

  if (( extra_participants > 0 )); then
    wait_for_container_health splice 60 2
    wait_for_container_health splice-onboarding 60 2
    if [[ "$auth_mode" == "shared-secret" ]]; then
      grant_localnet_validator_read_rights "$extra_participants"
    fi
    provision_extra_pqs "$extra_participants"
    local extra_pqs_services_list=()
    mapfile -t extra_pqs_services_list < <(extra_pqs_services "$extra_participants")
    docker_compose "${compose_args[@]}" up -d --no-recreate "${extra_pqs_services_list[@]}"
  fi
}

load_repo_root_env
QUICKSTART_DIR="$(resolve_quickstart_dir)"
cd "$QUICKSTART_DIR"

if [[ ! -f .env.local ]]; then
  echo ".env.local not found. Bootstrapping Quickstart with 'make setup'."
  make setup
fi

if make_target_exists start-local-ledger; then
  make start-local-ledger
else
  auth_mode="$(read_env_value AUTH_MODE || true)"
  auth_mode="${auth_mode:-shared-secret}"
  echo "start-local-ledger target not found. Starting ledger-only compose stack directly."
  start_ledger_stack "$auth_mode"
fi

