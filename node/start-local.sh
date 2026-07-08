#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"

load_repo_root_env() {
    local env_file="$REPO_ROOT/.env"
    if [[ -f "$env_file" ]]; then
        set -a
        # shellcheck disable=SC1090
        source "$env_file"
        set +a
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

resolve_typescript_sdk_dir() {
    local candidate
    for candidate in \
        "${CANTON_TYPESCRIPT_SDK_DIR:-}" \
        "$SCRIPT_DIR/../daml/typescript-sdk" \
        "$SCRIPT_DIR/../../daml/typescript-sdk" \
        "$REPO_ROOT"
    do
        if [[ -n "$candidate" && -d "$candidate" ]]; then
            cd -- "$candidate" && pwd
            return 0
        fi
    done

    echo "Unable to locate the Canton TypeScript SDK. Set CANTON_TYPESCRIPT_SDK_DIR or place the checkout in a supported location." >&2
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
    mkdir -p "$output_dir"

    local env_file="$output_dir/extra-participants.env"
    local config_file="$output_dir/additional-config.extra-participants.conf"
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
            local ledger_port admin_port json_port http_health_port grpc_health_port
            local published_ledger_port published_admin_port published_json_port
            ledger_port="$(participant_port "$prefix" "$PARTICIPANT_LEDGER_API_PORT_SUFFIX")"
            admin_port="$(participant_port "$prefix" "$PARTICIPANT_ADMIN_API_PORT_SUFFIX")"
            json_port="$(participant_port "$prefix" "$PARTICIPANT_JSON_API_PORT_SUFFIX")"
            http_health_port="$(participant_port "$prefix" "$CANTON_HTTP_HEALTHCHECK_PORT_SUFFIX")"
            grpc_health_port="$(participant_port "$prefix" "$CANTON_GRPC_HEALTHCHECK_PORT_SUFFIX")"
            pqs_postgres_published_port="$(extra_pqs_postgres_port "$index")"
            published_ledger_port="$(published_port "$ledger_port")"
            published_admin_port="$(published_port "$admin_port")"
            published_json_port="$(published_port "$json_port")"

            printf 'CREATE_DATABASE_EXTRA_%s=%s\n' "$index" "$database"
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
}

EOF
        done
    } > "$config_file"

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
        sed 's/^/        /' "$config_file"
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
    local -n compose_args_ref="$2"
    local output_dir
    output_dir="$(generated_dir)"

    if (( count == 0 )); then
        rm -rf "$output_dir"
        return 0
    fi

    write_extra_participant_runtime_files "$count" "$output_dir" "$PARTY_HINT_BASE"
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

connect_extra_participants() {
    local count="$1"
    if (( count == 0 )); then
        return 0
    fi

    local sdk_dir
    sdk_dir="$(resolve_typescript_sdk_dir)"

    local extra_admin_ports=()
    local index
    for ((index = 1; index <= count; index++)); do
        local prefix=$((index + 4))
        extra_admin_ports+=("$(published_port "$(participant_port "$prefix" "$PARTICIPANT_ADMIN_API_PORT_SUFFIX")")")
    done

    (
        cd "$sdk_dir"
        START_LOCAL_EXTRA_ADMIN_PORTS="$(IFS=,; printf '%s' "${extra_admin_ports[*]}")" \
            node --input-type=module <<'EOF'
import { GrpcTransport } from "@protobuf-ts/grpc-transport";
import { ChannelCredentials } from "@grpc/grpc-js";
import { SynchronizerConnectivityServiceClient } from "./dist/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/synchronizer_connectivity_service.client.js";
import {
  ConnectSynchronizerRequest,
  ListConnectedSynchronizersRequest,
} from "./dist/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/synchronizer_connectivity_service.js";
import { SequencerConnectionValidation } from "./dist/transports/grpc/generated/canton/com/digitalasset/canton/admin/sequencer/v30/sequencer_connection.js";

const insecure = ChannelCredentials.createInsecure();

function transportForPort(port) {
  return new GrpcTransport({
    host: `127.0.0.1:${port}`,
    channelCredentials: insecure,
  });
}

const destinationPorts = (process.env.START_LOCAL_EXTRA_ADMIN_PORTS ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

if (destinationPorts.length === 0) {
  process.exit(0);
}

const duration = (seconds) => ({ seconds: BigInt(seconds), nanos: 0 });
const config = {
  synchronizerAlias: "local",
  manualConnect: false,
  priority: 0,
  initializeFromTrustedSynchronizer: false,
  sequencerConnections: {
    sequencerConnections: [
      {
        alias: "sequencer",
        type: {
          oneofKind: "grpc",
          grpc: {
            connections: ["http://canton:5008"],
            transportSecurity: false,
          },
        },
      },
    ],
    sequencerTrustThreshold: 1,
    submissionRequestAmplification: {
      factor: 1,
      patience: duration(1),
      confirmationResponseFactor: 1,
      confirmationResponsePatience: duration(1),
    },
    sequencerLivenessMargin: 2,
    sequencerConnectionPoolDelays: {
      minRestartDelay: duration(1),
      maxRestartDelay: duration(2),
      subscriptionRequestDelay: duration(1),
      warnValidationDelay: duration(1),
    },
    subscriptionLivenessLimits: {
      maxTimestampDelta: duration(30),
      maxOrdinalDelta: 0,
    },
  },
  timeTracker: {
    observationLatency: duration(1),
    patienceDuration: duration(2),
    minObservationDuration: duration(1),
    timeProofRequest: {
      initialRetryDelay: duration(1),
      maxRetryDelay: duration(2),
      maxSequencingDelay: duration(2),
    },
  },
};

for (const port of destinationPorts) {
  const destinationTransport = transportForPort(port);
  const destinationClient = new SynchronizerConnectivityServiceClient(destinationTransport);

  try {
    const connectResponse = await destinationClient.connectSynchronizer(
      ConnectSynchronizerRequest.create({
        config,
        sequencerConnectionValidation: SequencerConnectionValidation.ACTIVE,
      }),
    ).response;

    if (!connectResponse.connectedSuccessfully) {
      throw new Error(`participant admin port ${port} did not connect successfully`);
    }

    const connectedResponse = await destinationClient.listConnectedSynchronizers(
      ListConnectedSynchronizersRequest.create(),
    ).response;

    if ((connectedResponse.connectedSynchronizers ?? []).length === 0) {
      throw new Error(`participant admin port ${port} has no connected synchronizers after connect`);
    }
  } finally {
    destinationTransport.close();
  }
}

process.exit(0);
EOF
    )
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
    printf '%s\n' splice splice-onboarding pqs-app-provider
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
pipeline.oauth.accessToken="${pqs_user_token}"
EOF
'
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
    )

    if [[ "$auth_mode" == "oauth2" ]]; then
        compose_args+=(
            -f "$modules_dir/keycloak/compose.yaml"
            --env-file "$modules_dir/keycloak/compose.env"
            --profile keycloak
        )
    fi

    append_extra_participant_args "$extra_participants" compose_args
    docker compose "${compose_args[@]}" down -v --remove-orphans
    mapfile -t startup_services < <(prerequisite_services "$auth_mode")
    mapfile -t followup_services < <(dependent_services)

    docker compose "${compose_args[@]}" up -d --no-recreate "${startup_services[@]}"
    wait_for_canton_health "$extra_participants"
    docker compose "${compose_args[@]}" up -d --no-recreate "${followup_services[@]}"

    if (( extra_participants > 0 )); then
        wait_for_container_health splice-onboarding 60 2
        connect_extra_participants "$extra_participants"
        provision_extra_pqs "$extra_participants"
        local extra_pqs_services_list=()
        mapfile -t extra_pqs_services_list < <(extra_pqs_services "$extra_participants")
        docker compose "${compose_args[@]}" up -d --no-recreate "${extra_pqs_services_list[@]}"
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
