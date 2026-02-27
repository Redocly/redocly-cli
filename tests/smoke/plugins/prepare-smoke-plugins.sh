#!/bin/bash

# For npm (Mutates packages/cli/package.json)
pnpm run pack:prepare

cp ./redocly-cli.tgz ./openapi-core.tgz ./respect-core.tgz ./tests/smoke/plugins

echo "Current directory:"
pwd
echo
echo "Current directory content:"
ls -a
echo
echo "Target directory content:"
ls -a tests/smoke/plugins/
echo
