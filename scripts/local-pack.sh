#!/bin/sh

# Backup package.json files
cp packages/core/package.json packages/core/package.json.bak
cp packages/respect-core/package.json packages/respect-core/package.json.bak

# Build and pack core package
cd packages/core
core=$(npm pack | tail -n 1)
mv $core ../../openapi-core.tgz
cd ../../

# Update and pack respect-core package
cd packages/respect-core
jq '.dependencies["@redocly/openapi-core"] = "./openapi-core.tgz"' package.json > tmp.json && mv tmp.json package.json
respect_core=$(npm pack | tail -n 1)
mv $respect_core ../../respect-core.tgz
cd ../../

# Update and pack cli package
cd packages/cli
publish_dir=$(jq -r '.publishConfig.directory // ".publish"' package.json)
npm run prepare:publish-dir
cli=$(npm pack "./$publish_dir" | tail -n 1)
npm run clean:publish-dir
mv $cli ../../redocly-cli.tgz
cd ../../

# Restore original package.json files
mv packages/core/package.json.bak packages/core/package.json
mv packages/respect-core/package.json.bak packages/respect-core/package.json
