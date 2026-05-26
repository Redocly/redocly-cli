#!/bin/bash

set -eo pipefail # Fail on script errors

# Clone the repo with test openapi files:
git clone https://github.com/Rebilly/api-definitions.git
cd api-definitions && pnpm install && cd ..

BUNDLE_CMDS=$(cat package.json | jq '.dependencies' | jq 'keys' | jq 'map("'\''node node_modules/" + . + "/bin/cli.js bundle all@latest --config=api-definitions/redocly.yaml'\''")' | jq 'join(" ")' | xargs)
LINT_CMDS=$(cat package.json | jq '.dependencies' | jq 'keys' | jq 'map("'\''node node_modules/" + . + "/bin/cli.js lint all@latest --config=api-definitions/redocly.yaml --generate-ignore-file'\''")' | jq 'join(" ")' | xargs)

# Lint --prepare wipes the ignore file each run so iterations do equal work:
echo "REDOCLY_SUPPRESS_UPDATE_NOTICE=true hyperfine --warmup 2 ${BUNDLE_CMDS} --export-markdown benchmark_bundle.md --export-json benchmark_bundle.json && REDOCLY_SUPPRESS_UPDATE_NOTICE=true hyperfine --warmup 2 --prepare 'rm -f api-definitions/.redocly.lint-ignore.yaml' ${LINT_CMDS} --export-markdown benchmark_lint.md --export-json benchmark_lint.json" > test-command.txt

# Put the command in the test section of the package.json:
cat package.json | jq ".scripts.test = \"$(cat test-command.txt)\"" > package.json
