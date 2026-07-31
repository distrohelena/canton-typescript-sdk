#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
RUNTIME_DIR="${PARTICIPANT_358_RUNTIME_DIR:-$REPO_ROOT/.generated/participant-358}"
PROJECT_NAME="${PARTICIPANT_358_PROJECT_NAME:-canton-participant-358}"
CANTON_IMAGE="${PARTICIPANT_358_CANTON_IMAGE:-ghcr.io/digital-asset/decentralized-canton-sync/docker/canton:0.6.12}"
POSTGRES_IMAGE="${PARTICIPANT_358_POSTGRES_IMAGE:-postgres:16}"
NETWORK_NAME="${PARTICIPANT_358_NETWORK:-quickstart}"
LEDGER_PORT="${PARTICIPANT_358_LEDGER_PORT:-8901}"
ADMIN_PORT="${PARTICIPANT_358_ADMIN_PORT:-8902}"
JSON_PORT="${PARTICIPANT_358_JSON_PORT:-8975}"
SOURCE_ADMIN_ENDPOINT="${PARTICIPANT_358_SOURCE_ADMIN_ENDPOINT:-localhost:3902}"
DOCKER_COMPOSE_CMD=()

resolve_docker_compose_cmd() {
  if docker compose version >/dev/null 2>&1; then DOCKER_COMPOSE_CMD=(docker compose); return; fi
  if docker-compose version >/dev/null 2>&1; then DOCKER_COMPOSE_CMD=(docker-compose); return; fi
  echo "Unable to find a working Docker Compose command." >&2
  exit 1
}

validate_port() {
  local value="$1"
  [[ "$value" =~ ^[1-9][0-9]{0,4}$ ]] && (( value <= 65535 )) || { echo "Invalid port: $value" >&2; exit 1; }
}

for port in "$LEDGER_PORT" "$ADMIN_PORT" "$JSON_PORT"; do validate_port "$port"; done
if [[ "$LEDGER_PORT" == "$ADMIN_PORT" || "$LEDGER_PORT" == "$JSON_PORT" || "$ADMIN_PORT" == "$JSON_PORT" ]]; then
  echo "Participant 3.5.8 Ledger, Admin, and JSON ports must be distinct." >&2
  exit 1
fi
for normal_port in 3901 3902 3975; do
  if [[ "$LEDGER_PORT" == "$normal_port" || "$ADMIN_PORT" == "$normal_port" || "$JSON_PORT" == "$normal_port" ]]; then
    echo "Participant 3.5.8 ports must not collide with CN Quickstart ports." >&2
    exit 1
  fi
done

assert_host_port_available() {
  local port="$1"
  if command -v ss >/dev/null 2>&1 && ss -ltn "sport = :$port" | tail -n +2 | grep -q .; then
    echo "Host port $port is already in use. Set the corresponding PARTICIPANT_358_*_PORT value." >&2
    exit 1
  fi
}
for port in "$LEDGER_PORT" "$ADMIN_PORT" "$JSON_PORT"; do assert_host_port_available "$port"; done

mkdir -p "$RUNTIME_DIR"
chmod 700 "$RUNTIME_DIR"
SYNCHRONIZER_CONFIG="$RUNTIME_DIR/registered-synchronizer.json"
cat > "$RUNTIME_DIR/participant-358.env" <<EOF
PARTICIPANT_358_SYNCHRONIZER_CONFIG=$SYNCHRONIZER_CONFIG
PARTICIPANT_358_SOURCE_ADMIN_ENDPOINT=$SOURCE_ADMIN_ENDPOINT
PARTICIPANT_358_ADMIN_ENDPOINT=localhost:$ADMIN_PORT
EOF
chmod 600 "$RUNTIME_DIR/participant-358.env"

cat > "$RUNTIME_DIR/canton.conf" <<EOF
canton {
  parameters { manual-start = no }
  participants.participant358 {
    storage {
      type = postgres
      config {
        dataSourceClass = "org.postgresql.ds.PGSimpleDataSource"
        properties {
          serverName = \${?DB_SERVER}
          portNumber = 5432
          databaseName = participant358
          currentSchema = participant358
          user = \${?DB_USER}
          password = \${?DB_PASSWORD}
        }
      }
    }
    init {
      generate-topology-transactions-and-keys = true
      identity.type = auto
    }
    admin-api {
      address = "0.0.0.0"
      port = 5002
    }
    ledger-api {
      address = "0.0.0.0"
      port = 5001
      auth-services = [{
        type = unsafe-jwt-hmac-256
        target-audience = "https://canton.network.global"
        secret = "unsafe"
      }]
      user-management-service.additional-admin-user-id = "ledger-api-user"
    }
    http-ledger-api {
      address = "0.0.0.0"
      port = 7575
    }
    monitoring.http-health-server {
      address = "0.0.0.0"
      port = 7000
    }
  }
}
EOF

cat > "$RUNTIME_DIR/compose.yaml" <<EOF
name: $PROJECT_NAME
services:
  postgres:
    image: $POSTGRES_IMAGE
    environment:
      POSTGRES_DB: participant358
      POSTGRES_USER: participant358
      POSTGRES_PASSWORD: participant358
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U participant358 -d participant358"]
      interval: 2s
      timeout: 3s
      retries: 30
  canton:
    image: $CANTON_IMAGE
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      DB_SERVER: postgres
      DB_USER: participant358
      DB_PASSWORD: participant358
    volumes:
      - "$RUNTIME_DIR/canton.conf:/app/app.conf:ro"
    ports:
      - "127.0.0.1:$LEDGER_PORT:5001"
      - "127.0.0.1:$ADMIN_PORT:5002"
      - "127.0.0.1:$JSON_PORT:7575"
    networks:
      - default
      - localnet
networks:
  localnet:
    external: true
    name: $NETWORK_NAME
EOF

if [[ "${PARTICIPANT_358_SKIP_SYNCHRONIZER_CONNECT:-0}" != "1" ]]; then
  PARTICIPANT_358_SYNCHRONIZER_CONFIG="$SYNCHRONIZER_CONFIG" \
  PARTICIPANT_358_SOURCE_ADMIN_ENDPOINT="$SOURCE_ADMIN_ENDPOINT" \
  PARTICIPANT_358_SOURCE_ADMIN_BEARER_TOKEN="${PARTICIPANT_358_SOURCE_ADMIN_BEARER_TOKEN:-}" \
  node "$SCRIPT_DIR/participant-358-synchronizer.mjs" export
fi

resolve_docker_compose_cmd
"${DOCKER_COMPOSE_CMD[@]}" --project-name "$PROJECT_NAME" --file "$RUNTIME_DIR/compose.yaml" up -d

if [[ "${PARTICIPANT_358_SKIP_SYNCHRONIZER_CONNECT:-0}" != "1" ]]; then
  deadline=$((SECONDS + ${PARTICIPANT_358_CONNECT_TIMEOUT_SECONDS:-90}))
  until PARTICIPANT_358_SYNCHRONIZER_CONFIG="$SYNCHRONIZER_CONFIG" \
    PARTICIPANT_358_ADMIN_ENDPOINT="localhost:$ADMIN_PORT" \
    PARTICIPANT_358_ADMIN_BEARER_TOKEN="${PARTICIPANT_358_ADMIN_BEARER_TOKEN:-}" \
    node "$SCRIPT_DIR/participant-358-synchronizer.mjs" connect
  do
    if (( SECONDS >= deadline )); then
      echo "Participant 3.5.8 sidecar did not become ready. Inspect: ${DOCKER_COMPOSE_CMD[*]} --project-name $PROJECT_NAME --file $RUNTIME_DIR/compose.yaml logs canton" >&2
      exit 1
    fi
    sleep 2
  done
fi

cat <<EOF
Participant 3.5.8 sidecar is ready.
export SDK_TEST_LEDGER_ENDPOINT=localhost:$LEDGER_PORT
export SDK_TEST_LEDGER_ADMIN_ENDPOINT=localhost:$LEDGER_PORT
export SDK_TEST_PARTICIPANT_ADMIN_ENDPOINT=localhost:$ADMIN_PORT
EOF
