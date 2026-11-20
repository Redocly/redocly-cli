#!/bin/bash

set -eo pipefail # Fail on script errors

# Pack openapi-core as it is published.
# Only openapi-core is needed, so this skips `npm run pack:prepare`, which packs every package.
core=$(npm pack -w @redocly/openapi-core | tail -n 1)
mv "$core" tests/smoke/bundled-core/openapi-core.tgz

cd tests/smoke/bundled-core
npm i

# Bundle openapi-core into a consumer and make sure it still resolves plugins
build_log=$(mktemp)
npm run build 2>&1 | tee "$build_log"
if grep -q 'Critical dependency' "$build_log"; then
  echo "Bundling openapi-core reported a critical dependency"
  exit 1
fi
npm start | grep 'Loaded plugins: test-plugin'
