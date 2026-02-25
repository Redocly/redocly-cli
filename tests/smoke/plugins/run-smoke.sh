#!/bin/bash

set -eo pipefail # Fail on script errors

cd tests/smoke/plugins
echo
echo "Directory content:"
ls -a
echo

# Install plugin package
pnpm i

# Install CLI globally
pnpm i redocly-cli.tgz -g

# Actual smoke test - executing the command provided as the second argument
pnpm run redocly-version
pnpm run  redocly-lint
