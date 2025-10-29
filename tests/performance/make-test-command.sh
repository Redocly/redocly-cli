#!/bin/bash

set -eo pipefail # Fail on script errors

# Clone the repo with test openapi files:
git clone https://github.com/Rebilly/api-definitions.git
cd api-definitions && npm install && cd ..

# Store the command into a text file:
echo REDOCLY_SUPPRESS_UPDATE_NOTICE=true hyperfine --warmup 3 $(cat package.json | jq '.dependencies' | jq 'keys' | jq 'map("'\''node node_modules/" + . + "/bin/cli.js lint --config=api-definitions/redocly.yaml --generate-ignore-file'\''")' | jq 'join(" ")' | xargs) --export-markdown benchmark_check.md --export-json benchmark_check.json > test-command.txt

# Put the command in the test section of the package.json:
cat package.json | jq ".scripts.test = \"$(cat test-command.txt)\"" > package.json
