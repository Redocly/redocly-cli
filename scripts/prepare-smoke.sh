#!/bin/bash

# For Workflows (Webpack)
npm run webpack-bundle 

# For yarn (Doesn't support version changing)
(cd packages/cli && cli=$(npm pack | tail -n 1) && mv $cli ../../__tests__/smoke/redocly-cli-clean.tgz) 

# For npm (Mutates packages/cli/package.json)
npm run pack:prepare

cp ./redocly-cli.tgz ./openapi-core.tgz ./dist/bundle.js ./__tests__/smoke/

echo "Current directory:"
pwd
echo
echo "Current directory content:"
ls -a
echo
echo "Target directory content:"
ls -a __tests__/smoke/
echo
