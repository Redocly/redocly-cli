#!/bin/sh

# Backup package.json files
cp packages/core/package.json packages/core/package.json.bak
cp packages/respect-core/package.json packages/respect-core/package.json.bak
cp packages/client-generator/package.json packages/client-generator/package.json.bak
cp packages/recheck/package.json packages/recheck/package.json.bak
cp packages/cli/package.json packages/cli/package.json.bak

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

# Update and pack client-generator package
cd packages/client-generator
jq '.dependencies["@redocly/openapi-core"] = "./openapi-core.tgz"' package.json > tmp.json && mv tmp.json package.json
client_generator=$(npm pack | tail -n 1)
mv $client_generator ../../client-generator.tgz
cd ../../

# Pack recheck package
cd packages/recheck
recheck=$(npm pack | tail -n 1)
mv $recheck ../../recheck.tgz
cd ../../

# Update and pack cli from its staged, dependency-free publish directory
cd packages/cli
jq '.devDependencies["@redocly/recheck"] = "./recheck.tgz"' package.json > tmp.json && mv tmp.json package.json
npm run prepare:publish-dir
cli=$(npm pack ./.publish | tail -n 1)
npm run clean:publish-dir
mv $cli ../../redocly-cli.tgz
cd ../../

# Restore original package.json files
mv packages/core/package.json.bak packages/core/package.json
mv packages/respect-core/package.json.bak packages/respect-core/package.json
mv packages/client-generator/package.json.bak packages/client-generator/package.json
mv packages/recheck/package.json.bak packages/recheck/package.json
mv packages/cli/package.json.bak packages/cli/package.json
