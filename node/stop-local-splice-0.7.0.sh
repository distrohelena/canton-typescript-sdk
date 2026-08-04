#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
export IMAGE_TAG="${IMAGE_TAG:-0.7.0}"
exec "${STOP_LOCAL_SCRIPT:-$SCRIPT_DIR/stop-local.sh}" "$@"
