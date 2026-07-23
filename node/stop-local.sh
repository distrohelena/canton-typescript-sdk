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

read_env_value() {
  local key="$1"
  local file
  for file in .env.local .env; do
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

append_existing_extra_participant_args() {
  local -n compose_args_ref="$1"
  local output_dir
  output_dir="$(generated_dir)"

  if [[ -f "$output_dir/compose-extra-participants.yaml" && -f "$output_dir/extra-participants.env" ]]; then
    compose_args_ref+=(
      -f "$output_dir/compose-extra-participants.yaml"
      --env-file "$output_dir/extra-participants.env"
    )
  fi
}

stop_ledger_stack() {
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

  append_existing_extra_participant_args compose_args
  docker_compose "${compose_args[@]}" down -v --remove-orphans
}

load_repo_root_env
QUICKSTART_DIR="$(resolve_quickstart_dir)"
cd "$QUICKSTART_DIR"

if [[ ! -f .env.local ]]; then
  echo ".env.local not found. Nothing to stop."
  exit 0
fi

if make_target_exists stop-local-ledger; then
  make stop-local-ledger
else
  auth_mode="$(read_env_value AUTH_MODE || true)"
  auth_mode="${auth_mode:-shared-secret}"
  echo "stop-local-ledger target not found. Stopping ledger-only compose stack directly."
  stop_ledger_stack "$auth_mode"
fi

