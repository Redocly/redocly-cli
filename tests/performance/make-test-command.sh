#!/bin/bash

set -eo pipefail # Fail on script errors

# Clone the repo with test openapi files:
git clone https://github.com/Rebilly/api-definitions.git
cd api-definitions && pnpm install && cd ..

build_cmds() {
  jq -r --arg sub "$1" --arg extra "${2:-}" '.dependencies | keys | map("'\''node node_modules/" + . + "/bin/cli.js " + $sub + " all@latest --config=api-definitions/redocly.yaml" + $extra + "'\''") | join(" ")' package.json
}

echo "REDOCLY_SUPPRESS_UPDATE_NOTICE=true hyperfine --warmup 2 $(build_cmds 'bundle') --export-markdown benchmark_bundle.md --export-json benchmark_bundle.json && REDOCLY_SUPPRESS_UPDATE_NOTICE=true hyperfine --warmup 2 --prepare 'rm -f api-definitions/.redocly.lint-ignore.yaml' $(build_cmds 'lint' ' --generate-ignore-file') --export-markdown benchmark_lint.md --export-json benchmark_lint.json" > test-command.txt

# Put the command in the test section of the package.json:
cat package.json | jq ".scripts.test = \"$(cat test-command.txt)\"" > package.json
