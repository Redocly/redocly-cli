#!/bin/bash

set -eo pipefail

if [ -z "$1" ] || [ -z "$2" ]; then
  echo "Usage: bash tests/lint-output/run.sh <path-to-cli-index.js> <output-dir>" >&2
  exit 2
fi

cli="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
mkdir -p "$2"
out="$(cd "$2" && pwd)"
# compare.mjs reads every cell in the folder, so a removed cell must not stay.
rm -f "$out"/*.json "$out"/*.stderr "$out"/*.exit

cd "$(dirname "$0")"

rebilly_commit=68fd73321e5997ad4dc916417433e2d46be51f08
github_commit=9f6ad3b0ba6f7ef9619adb7135a1a56de62ed2d3
okta_commit=74fcd17fad54332caee96ebbb11fd7f203b03e4f

if [ ! -d api-definitions ]; then
  git clone --quiet https://github.com/Rebilly/api-definitions.git
fi
if ! git -C api-definitions cat-file -e "$rebilly_commit^{commit}" 2> /dev/null; then
  git -C api-definitions fetch --quiet origin
fi
git -C api-definitions -c advice.detachedHead=false checkout --quiet "$rebilly_commit"
(cd api-definitions && pnpm install)

mkdir -p specs
github_spec="specs/github-$github_commit.yaml"
okta_spec="specs/okta-$okta_commit.yaml"
if [ ! -f "$github_spec" ]; then
  curl -fsSL "https://raw.githubusercontent.com/github/rest-api-description/$github_commit/descriptions/api.github.com/api.github.com.yaml" -o "$github_spec"
fi
if [ ! -f "$okta_spec" ]; then
  curl -fsSL "https://raw.githubusercontent.com/okta/okta-management-openapi-spec/$okta_commit/dist/current/management-minimal.yaml" -o "$okta_spec"
fi

export REDOCLY_TELEMETRY=off
export REDOCLY_SUPPRESS_UPDATE_NOTICE=true
export NO_COLOR=1
unset FORCE_COLOR

lint_cell() {
  local name="$1"
  shift
  local exit_code=0
  node "$cli" lint "$@" --format=json --max-problems 1000000 > "$out/$name.json" 2> "$out/$name.stderr" || exit_code=$?
  echo "$exit_code" > "$out/$name.exit"
  echo "$name: exit $exit_code"
}

lint_cell Rebilly.custom all@latest --config api-definitions/redocly.yaml
lint_cell Rebilly.recommended api-definitions/openapi/openapi.yaml --extends=recommended
lint_cell GitHub.recommended "$github_spec" --extends=recommended
lint_cell Okta.recommended "$okta_spec" --extends=recommended
