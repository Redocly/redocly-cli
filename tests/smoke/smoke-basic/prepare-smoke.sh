#!/bin/bash

# For npm (Mutates packages/cli/package.json)
npm run pack:prepare

cp ./redocly-cli.tgz ./openapi-core.tgz ./respect-core.tgz resources/pets.yaml resources/museum.yaml resources/museum-tickets.arazzo.yaml ./tests/smoke/smoke-basic/

echo "Current directory:"
pwd
echo
echo "Current directory content:"
ls -a
echo
echo "Target directory content:"
ls -a tests/smoke/smoke-basic/
echo
