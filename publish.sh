#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

# --no-git-tag-version: the working tree routinely carries an uncommitted package.json,
# and plain `npm version` refuses to run on a dirty tree (and would commit + tag).
new_version="$(npm version patch --no-git-tag-version)"

# Promote the Unreleased section so every published version has a changelog entry.
if ! grep -q "^## \[${new_version#v}\]" CHANGELOG.md; then
  if ! grep -A2 "^## \[Unreleased\]" CHANGELOG.md | grep -q "^###"; then
    echo "CHANGELOG.md has no entry for ${new_version} and Unreleased is empty; write one first." >&2
    exit 1
  fi
  today="$(date +%Y-%m-%d)"
  sed -i "s|^## \[Unreleased\]|## [Unreleased]\n\n## [${new_version#v}] - ${today}|" CHANGELOG.md
fi

echo "Publishing ${new_version}..."

npm publish

git add package.json package-lock.json CHANGELOG.md
git commit -m "chore: release ${new_version}"

echo "Published ${new_version}."
