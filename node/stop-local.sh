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

    mapfile -t services < <(ledger_services "$auth_mode")
    docker compose "${compose_args[@]}" rm -s -f "${services[@]}"
}

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
