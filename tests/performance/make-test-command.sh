#!/bin/bash

set -eo pipefail # Fail on script errors

# Clone the repo with test openapi files:
git clone https://github.com/Rebilly/api-definitions.git
cd api-definitions && pnpm install && cd ..

# Store the command into a text file.
# Pre-warm the OS page cache so the first measured run does not pay a cold-cache
# penalty; with that done, --warmup 1 is enough to stabilise per-process state.
echo "find node_modules/cli-* -type f -print0 | xargs -0 cat > /dev/null && find api-definitions -type f -print0 | xargs -0 cat > /dev/null &&" REDOCLY_SUPPRESS_UPDATE_NOTICE=true hyperfine --warmup 1 --min-runs 10 --max-runs 15 $(cat package.json | jq '.dependencies' | jq 'keys' | jq 'map("'\''node node_modules/" + . + "/bin/cli.js bundle all@latest --config=api-definitions/redocly.yaml'\''")' | jq 'join(" ")' | xargs) --export-markdown benchmark_check.md --export-json benchmark_check.json > test-command.txt

# Put the command in the test section of the package.json:
cat package.json | jq ".scripts.test = \"$(cat test-command.txt)\"" > package.json
