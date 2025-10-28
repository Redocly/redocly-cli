#!/bin/bash

set -eo pipefail # Fail on script errors

cd tests/smoke/plugins
echo
echo "Directory content:"
ls -a
echo

# Install plugin package
npm i

# Install CLI globally
npm i redocly-cli.tgz -g

# Actual smoke test - executing the command provided as the second argument
npm run redocly-version
npm run  redocly-lint
