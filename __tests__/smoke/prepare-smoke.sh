#!/bin/bash

# For Workflows (Webpack)
npm run webpack-bundle 

# For npm (Mutates packages/cli/package.json)
npm run pack:prepare

cp ./redocly-cli.tgz ./openapi-core.tgz ./respect-core.tgz ./dist/bundle.js resources/pets.yaml resources/museum.yaml ./__tests__/smoke/

echo "Current directory:"
pwd
echo
echo "Current directory content:"
ls -a
echo
echo "Target directory content:"
ls -a __tests__/smoke/
echo
