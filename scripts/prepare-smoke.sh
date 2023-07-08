#!/bin/bash

(cd packages/cli && cli=$(npm pack | tail -n 1) && mv $cli ../../redocly-cli-clean.tgz) # for yarn

npm run pack:prepare # for npm

echo "Current directory:"
pwd
echo
echo "Current directory content:"
ls -a
echo
echo "Target directory content:"
ls -a __tests__/smoke/
echo

cp ./redocly-cli.tgz ./redocly-cli-clean.tgz ./openapi-core.tgz ./__tests__/smoke/
