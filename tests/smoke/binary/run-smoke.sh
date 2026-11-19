#!/usr/bin/env bash
# Runs a standalone binary through the commands that read files embedded in it, fetch over the
# network, import packages from node_modules, or start a product package on its embedded runtime.
# Usage: bash tests/smoke/binary/run-smoke.sh <path to the binary>
set -euo pipefail

binary="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
repo_dir="$(cd "$(dirname "$0")/../../.." && pwd)"
cafe="$repo_dir/resources/cafe.yaml"
# The ejected generator imports `@redocly/client-generator`, so it runs inside the repository, where
# node_modules has it.
generator_dir="$(mktemp -d "$repo_dir/.smoke-generator.XXXXXX")"
trap 'rm -rf "$generator_dir"; if [ -n "${preview_pid:-}" ]; then kill -- -"$preview_pid" || true; fi' EXIT
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

(
  cd "$generator_dir"
  "$binary" eject-generator typescript
  "$binary" generate-client "$cafe" --generator ./generators/typescript/index.ts --output client.ts
  test -f client.ts
)

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

if [ "${SKIP_PREVIEW:-}" = true ]; then
  exit 0
fi

mkdir preview && printf '# Smoke test\n' > preview/index.md
# Job control starts the preview in its own process group, so the exit trap also stops the server
# that the preview starts.
set -m
"$binary" preview --project-dir=preview --plan=pro --port=4555 > preview.log 2>&1 &
preview_pid=$!
for _ in $(seq 1 300); do
  if curl -sf -o /dev/null http://127.0.0.1:4555/; then
    echo "The preview is up."
    exit 0
  fi
  sleep 1
done
cat preview.log
echo "The preview did not start."
exit 1
