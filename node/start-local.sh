#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"

read_root_env_value() {
    local key="$1"
    local env_file="$ROOT_DIR/.env"

    if [[ ! -f "$env_file" ]]; then
        return 1
    fi

    local line
    line="$(grep -E "^${key}=" "$env_file" | tail -n 1 || true)"
    if [[ -z "$line" ]]; then
        return 1
    fi

    printf '%s\n' "${line#*=}"
}

resolve_quickstart_dir() {
    local candidate
    local root_env_candidate
    root_env_candidate="$(read_root_env_value CN_QUICKSTART_DIR || true)"

    for candidate in \
        "${CN_QUICKSTART_DIR:-}" \
        "$root_env_candidate" \
        "$SCRIPT_DIR/../cn-quickstart/quickstart" \
        "$SCRIPT_DIR/../../cn-quickstart/quickstart"
    do
        if [[ -n "$candidate" && -d "$candidate" ]]; then
            cd -- "$candidate" && pwd
            return 0
        fi
    done

    echo "Unable to locate CN Quickstart. Set CN_QUICKSTART_DIR or add it to the repo root .env." >&2
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

ledger_services() {
    local auth_mode="$1"
    local services=(postgres canton splice splice-onboarding pqs-app-provider)
    if [[ "$auth_mode" == "oauth2" ]]; then
        services=(keycloak nginx-keycloak "${services[@]}")
    fi
    printf '%s\n' "${services[@]}"
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

wait_for_canton_health() {
    local attempts=30
    local delay_seconds=2
    local status

    for ((i = 1; i <= attempts; i++)); do
        status="$(docker inspect --format '{{.State.Health.Status}}' canton 2>/dev/null | tail -n 1 || true)"
        if [[ "$status" == "healthy" ]]; then
            return 0
        fi
        sleep "$delay_seconds"
    done

    echo "canton did not become healthy after $((attempts * delay_seconds)) seconds." >&2
    return 1
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

    mapfile -t startup_services < <(prerequisite_services "$auth_mode")
    mapfile -t followup_services < <(dependent_services)

    docker compose "${compose_args[@]}" up -d --no-recreate "${startup_services[@]}"
    wait_for_canton_health
    docker compose "${compose_args[@]}" up -d --no-recreate "${followup_services[@]}"
}

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
