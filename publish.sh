#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

# --no-git-tag-version: the working tree routinely carries an uncommitted package.json,
# and plain `npm version` refuses to run on a dirty tree (and would commit + tag).
new_version="$(npm version patch --no-git-tag-version)"

echo "Publishing ${new_version}..."

npm publish

echo "Published ${new_version}."
