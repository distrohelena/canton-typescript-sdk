#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
STOP_SCRIPT="$REPO_ROOT/node/stop-local-splice-0.6.14.sh"

[[ -x "$STOP_SCRIPT" ]]

tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

stub="$tmpdir/stub-stop-local.sh"
cat > "$stub" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
printf 'IMAGE_TAG=%s\n' "${IMAGE_TAG:-}"
printf 'args=%s\n' "$*"
EOF
chmod +x "$stub"

default_output="$(STOP_LOCAL_SCRIPT="$stub" "$STOP_SCRIPT" one two)"
grep -Fqx 'IMAGE_TAG=0.6.14' <<<"$default_output"
grep -Fqx 'args=one two' <<<"$default_output"

override_output="$(IMAGE_TAG=custom-tag STOP_LOCAL_SCRIPT="$stub" "$STOP_SCRIPT")"
grep -Fqx 'IMAGE_TAG=custom-tag' <<<"$override_output"

echo "test-stop-local-splice-0.6.14.sh: all cases passed"
