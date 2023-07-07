#!/bin/bash

npm i

(cd packages/cli && cli=$(npm pack | tail -n 1) && mv $cli ../../redocly-cli-clean.tgz) # for yarn

npm run pack:prepare # for npm


ls ..
mkdir ../__tmp__

cp ./redocly-cli.tgz ./redocly-cli-clean.tgz ./openapi-core.tgz ./resources/package.json ./resources/openapi.yaml ../__tmp__/
