#!/bin/bash

bash scripts/local-pack.sh

# npm i -g yarn@^1.22.19

ls ..
mkdir ../__tmp__

cp ./redocly-cli.tgz ./openapi-core.tgz ./resources/package.json ./resources/pets.yaml ../__tmp__/

cd ../__tmp__

ls




# npm i redocly-cli.tgz

# npm run l
# npm run b
# npm run d

