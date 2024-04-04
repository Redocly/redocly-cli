#!/bin/sh

cd packages/core && core=$(npm pack | tail -n 1) && mv $core ../../openapi-core.tgz && cd ../../ &&

version=$(cat ./packages/core/package.json | jq '.version' | tr -d '"')
jq '.dependencies."@redocly/openapi-core" = $packagefile' ./packages/cli/package.json --arg packagefile ./openapi-core.tgz > package.json.tmp && mv package.json.tmp ./packages/cli/package.json &&

cd packages/cli && cli=$(npm pack | tail -n 1) && mv $cli ../../redocly-cli.tgz

# Revert changes to package.json
cd ../../ && git checkout packages/cli/package.json
