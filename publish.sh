#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

# --no-git-tag-version: the working tree routinely carries an uncommitted package.json,
# and plain `npm version` refuses to run on a dirty tree (and would commit + tag).
new_version="$(npm version patch --no-git-tag-version)"

echo "Publishing ${new_version}..."

npm publish

git add package.json package-lock.json
git commit -m "chore: release ${new_version}"

echo "Published ${new_version}."
