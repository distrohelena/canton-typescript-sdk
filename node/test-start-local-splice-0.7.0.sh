#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
START_SCRIPT="$REPO_ROOT/node/start-local-splice-0.7.0.sh"

[[ -x "$START_SCRIPT" ]]

tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

stub="$tmpdir/stub-start-local.sh"
cat > "$stub" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
printf 'IMAGE_TAG=%s\n' "${IMAGE_TAG:-}"
printf 'args=%s\n' "$*"
EOF
chmod +x "$stub"

default_output="$(START_LOCAL_SCRIPT="$stub" "$START_SCRIPT" one two)"
grep -Fqx 'IMAGE_TAG=0.7.0' <<<"$default_output"
grep -Fqx 'args=one two' <<<"$default_output"

override_output="$(IMAGE_TAG=custom-tag START_LOCAL_SCRIPT="$stub" "$START_SCRIPT")"
grep -Fqx 'IMAGE_TAG=custom-tag' <<<"$override_output"

echo "test-start-local-splice-0.7.0.sh: all cases passed"
