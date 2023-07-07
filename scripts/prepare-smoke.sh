#!/bin/bash

npm i

npm run pack:prepare


ls ..
mkdir ../__tmp__

cp ./redocly-cli.tgz ./openapi-core.tgz ./resources/package.json ./resources/openapi.yaml ../__tmp__/


# # For yarn
# cd packages/cli
# npm pack
# pwd
# ls
# cp ./redocly-cli-1.0.0-beta.130.tgz ../../../__tmp__/redocly-cli-yarn.tgz

