#!/bin/sh

# Newest version of redocly-cli
docker run --rm -v ${PWD}:/spec redocly/openapi-cli:v1.0.0-beta.108 bundle -o result.yaml reproduce.yaml
docker run --rm -v ${PWD}:/spec redocly/openapi-cli:v1.0.0-beta.108 bundle -o result_with_ref.yaml reproduce_with_ref.yaml

# Version of redocly-cli at which bug was found
#docker run --rm -v ${PWD}:/spec redocly/openapi-cli:v1.0.0-beta.75 bundle -o result.yaml reproduce.yaml
#docker run --rm -v ${PWD}:/spec redocly/openapi-cli:v1.0.0-beta.75 bundle -o result_with_ref.yaml reproduce_with_ref.yaml
