#!/usr/bin/env bash
# Runs a standalone binary through the commands that read files embedded in it, fetch over the
# network, or start a product package on its embedded runtime.
# Usage: bash tests/smoke/binary/run-smoke.sh <path to the binary>
set -euo pipefail

binary="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
repo_dir="$(cd "$(dirname "$0")/../../.." && pwd)"
cafe="$repo_dir/resources/cafe.yaml"
cd "$(mktemp -d)"

expected_version="$(sed -n 's/^  "version": "\(.*\)",$/\1/p' "$repo_dir/packages/cli/package.json")"
actual_version="$("$binary" --version)"
if [ "$actual_version" != "$expected_version" ]; then
  echo "Expected version $expected_version, got $actual_version"
  exit 1
fi

grep -q 'redocly lint' <<< "$("$binary" --help)"

"$binary" lint "$cafe"
"$binary" lint https://raw.githubusercontent.com/Redocly/redocly-cli/main/resources/cafe.yaml
"$binary" bundle "$cafe" --output bundled.yaml
"$binary" build-docs "$cafe" --output docs.html
grep -q 'Redoc' docs.html

mkdir skills && (cd skills && mkdir .claude && "$binary" skills && test -f .claude/skills/redocly-cli/SKILL.md)

mkdir generator && (cd generator && "$binary" eject-generator php && test -f generators/php/index.ts)

mkdir recheck && cd recheck
cat > redocly.yaml <<'YAML'
recheck:
  rules:
    smoke/spelling:
      severity: error
      scope: summary
      message: 'Unknown word: %s%s'
      assertions:
        spelling: {}
YAML
printf '# Smoke test\n\nThis sentense has a typo.\n' > index.md
if recheck_output="$("$binary" recheck index.md 2>&1)"; then
  echo "recheck should have reported the typo"
  exit 1
fi
grep -q 'Unknown word: sentense' <<< "$recheck_output"
if grep -q 'Unknown word: This' <<< "$recheck_output"; then
  echo "recheck did not load its dictionary"
  exit 1
fi
cd ..

mkdir preview && printf '# Smoke test\n' > preview/index.md
"$binary" preview --project-dir=preview --plan=pro --port=4555 > preview.log 2>&1 &
for _ in $(seq 1 300); do
  if curl -sf -o /dev/null http://127.0.0.1:4555/; then
    echo "The preview is up."
    kill %1 || true
    exit 0
  fi
  sleep 1
done
cat preview.log
echo "The preview did not start."
exit 1
