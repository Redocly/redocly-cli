#!/bin/bash

set -eo pipefail

if [ -z "$1" ] || [ -z "$2" ]; then
  echo "Usage: bash tests/stress/run.sh <path-to-cli-index.js> <output-dir>" >&2
  exit 2
fi

cli="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
mkdir -p "$2"
out="$(cd "$2" && pwd)"

cd "$(dirname "$0")"

rebilly_commit=68fd73321e5997ad4dc916417433e2d46be51f08
github_commit=9f6ad3b0ba6f7ef9619adb7135a1a56de62ed2d3
okta_commit=74fcd17fad54332caee96ebbb11fd7f203b03e4f

if [ ! -d api-definitions ]; then
  git clone --quiet https://github.com/Rebilly/api-definitions.git
fi
git -C api-definitions -c advice.detachedHead=false checkout --quiet "$rebilly_commit"
if [ ! -d api-definitions/node_modules ]; then
  (cd api-definitions && pnpm install)
fi

mkdir -p specs
if [ ! -f specs/github.yaml ]; then
  curl -fsSL "https://raw.githubusercontent.com/github/rest-api-description/$github_commit/descriptions/api.github.com/api.github.com.yaml" -o specs/github.yaml
fi
if [ ! -f specs/okta.yaml ]; then
  curl -fsSL "https://raw.githubusercontent.com/okta/okta-management-openapi-spec/$okta_commit/dist/current/management-minimal.yaml" -o specs/okta.yaml
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
lint_cell Rebilly.recommended api-definitions/openapi/openapi.yaml --config configs/recommended.yaml
lint_cell GitHub.recommended specs/github.yaml --config configs/recommended.yaml
lint_cell Okta.recommended specs/okta.yaml --config configs/recommended.yaml
