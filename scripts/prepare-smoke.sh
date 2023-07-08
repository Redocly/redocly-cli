#!/bin/bash

# npm i # FIXME: delete or uncomment!

(cd packages/cli && cli=$(npm pack | tail -n 1) && mv $cli ../../redocly-cli-clean.tgz) # for yarn

npm run pack:prepare # for npm


echo "Current directory:"
pwd
echo
echo "Current directory content:"
ls -a
echo
echo "Parent directory content:"
ls -a ..
echo

mkdir ../__tmp__

cp ./redocly-cli.tgz ./redocly-cli-clean.tgz ./openapi-core.tgz ./resources/package.json ./resources/openapi.yaml ../__tmp__/
