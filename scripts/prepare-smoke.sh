#!/bin/bash

bash scripts/local-pack.sh

# npm i -g yarn@^1.22.19

ls ..
mkdir ../__tmp__

cp ./redocly-cli.tgz ./openapi-core.tgz ./resources/package.json ./resources/openapi.yaml ../__tmp__/
