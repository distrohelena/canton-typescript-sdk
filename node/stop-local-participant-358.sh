#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
RUNTIME_DIR="${PARTICIPANT_358_RUNTIME_DIR:-$REPO_ROOT/.generated/participant-358}"
PROJECT_NAME="${PARTICIPANT_358_PROJECT_NAME:-canton-participant-358}"
DOCKER_COMPOSE_CMD=()

if [[ ! -f "$RUNTIME_DIR/compose.yaml" ]]; then
  echo "Participant 3.5.8 sidecar is not configured. Nothing to stop."
  exit 0
fi
if docker compose version >/dev/null 2>&1; then DOCKER_COMPOSE_CMD=(docker compose); elif docker-compose version >/dev/null 2>&1; then DOCKER_COMPOSE_CMD=(docker-compose); else
  echo "Unable to find a working Docker Compose command." >&2
  exit 1
fi
"${DOCKER_COMPOSE_CMD[@]}" --project-name "$PROJECT_NAME" --file "$RUNTIME_DIR/compose.yaml" down --volumes --remove-orphans
