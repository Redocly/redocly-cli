#!/bin/bash

set -eo pipefail # Fail on script errors

# Clone the repo with test openapi files:
git clone https://github.com/Rebilly/api-definitions.git

# Store the command into a text file:
echo hyperfine -i --warmup 3 $(cat package.json | jq '.dependencies' | jq 'keys' | jq 'map("'\''node node_modules/" + . + "/bin/cli.js lint core@public --config=api-definitions/redocly.yaml'\''")' | jq 'join(" ")' | xargs) --export-markdown benchmark_check.md --export-json benchmark_check.json > test-command.txt

# Put the command in the test section of the package.json:
cat package.json | jq ".scripts.test = \"$(cat test-command.txt)\"" > package.json
