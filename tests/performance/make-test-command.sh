#!/bin/bash

set -eo pipefail # Fail on script errors

# Clone the repo with test openapi files:
git clone https://github.com/Rebilly/api-definitions.git
cd api-definitions && pnpm install && cd ..

# Store the command into a text file:
build_cmds() {
  jq -r --arg suffix "$1" '.dependencies | keys | map("'\''node node_modules/" + . + "/bin/cli.js " + $suffix + "'\''") | join(" ")' package.json
}

echo "REDOCLY_SUPPRESS_UPDATE_NOTICE=true hyperfine --warmup 2 $(build_cmds 'bundle all@latest --config=api-definitions/redocly.yaml') --export-markdown benchmark_bundle.md --export-json benchmark_bundle.json && REDOCLY_SUPPRESS_UPDATE_NOTICE=true hyperfine --warmup 2 $(build_cmds 'lint all@latest --config=api-definitions/redocly.yaml --generate-ignore-file') --export-markdown benchmark_lint.md --export-json benchmark_lint.json && REDOCLY_SUPPRESS_UPDATE_NOTICE=true hyperfine --warmup 2 $(build_cmds 'check-config --config=api-definitions/redocly.yaml --lint-config=warn') --export-markdown benchmark_check-config.md --export-json benchmark_check-config.json" > test-command.txt

# Put the command in the test section of the package.json:
cat package.json | jq ".scripts.test = \"$(cat test-command.txt)\"" > package.json
