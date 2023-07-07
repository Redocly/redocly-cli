#!/bin/bash

npm i

cd packages/cli && cli=$(npm pack | tail -n 1) && mv $cli ../../redocly-cli-clean.tgz # for yarn

npm run pack:prepare # for npm


ls ..
mkdir ../__tmp__

cp ./redocly-cli.tgz ./openapi-core.tgz ./resources/package.json ./resources/openapi.yaml ../__tmp__/


# # For yarn
# cd packages/cli
# npm pack
# pwd
# ls
# cp ./redocly-cli-1.0.0-beta.130.tgz ../../../__tmp__/redocly-cli-clean.tgz

