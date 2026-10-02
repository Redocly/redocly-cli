#!/bin/bash
# Lints the production specs with one CLI build and writes one report per cell.
# Usage: bash tests/stress/run.sh <path-to-cli-index.js> <output-dir>
# Run it once per build, then compare the two output directories with compare.mjs.

set -eo pipefail

if [ -z "$1" ] || [ -z "$2" ]; then
  echo "Usage: bash tests/stress/run.sh <path-to-cli-index.js> <output-dir>" >&2
  exit 2
fi

cli="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
mkdir -p "$2"
out="$(cd "$2" && pwd)"

# Every lint runs from this directory, so the file paths in the output are the same for both builds.
cd "$(dirname "$0")"

# Pinned sources. Change a commit here when a repository rewrites its history.
rebilly_commit=68fd73321e5997ad4dc916417433e2d46be51f08
github_commit=9f6ad3b0ba6f7ef9619adb7135a1a56de62ed2d3
okta_commit=74fcd17fad54332caee96ebbb11fd7f203b03e4f

if [ ! -d api-definitions ]; then
  git clone --quiet https://github.com/Rebilly/api-definitions.git
fi
git -C api-definitions -c advice.detachedHead=false checkout --quiet "$rebilly_commit"
if [ ! -d api-definitions/node_modules ]; then
  # Rebilly's plugins need their dependencies. The repository requires pnpm 11 or newer.
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
# A FORCE_COLOR from the caller shell would override NO_COLOR.
unset FORCE_COLOR

# Writes <name>.json, <name>.stderr, and <name>.exit for one cell.
lint_cell() {
  local name="$1"
  shift
  local exit_code=0
  node "$cli" lint "$@" --format=json --max-problems 1000000 > "$out/$name.json" 2> "$out/$name.stderr" || exit_code=$?
  echo "$exit_code" > "$out/$name.exit"
  echo "$name: exit $exit_code"
}

lint_cell rebilly.own all@latest --config api-definitions/redocly.yaml
lint_cell rebilly.recommended api-definitions/openapi/openapi.yaml --config configs/recommended.yaml
lint_cell rebilly.all api-definitions/openapi/openapi.yaml --config configs/all.yaml
lint_cell github.recommended specs/github.yaml --config configs/recommended.yaml
lint_cell github.all specs/github.yaml --config configs/all.yaml
lint_cell okta.recommended specs/okta.yaml --config configs/recommended.yaml
lint_cell okta.all specs/okta.yaml --config configs/all.yaml
