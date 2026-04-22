#!/bin/bash

# For npm (Mutates packages/cli/package.json)
npm run pack:prepare

cp ./redocly-cli.tgz ./openapi-core.tgz ./respect-core.tgz resources/pets.yaml resources/museum.yaml resources/museum-tickets.arazzo.yaml ./tests/smoke/basic/

# Pin @redocly/config to the exact version used by openapi-core to prevent yarn from resolving an older incompatible version
REDOCLY_CONFIG_VERSION=$(node -e "const fs = require('fs'); const p = JSON.parse(fs.readFileSync('./packages/core/package.json', 'utf8')); console.log(p.dependencies['@redocly/config'].replace(/\^/, ''));")
echo "Pinning @redocly/config to $REDOCLY_CONFIG_VERSION in smoke test overrides"
node -e "
  const fs = require('fs');
  const path = './tests/smoke/basic/package.json';
  const pkg = JSON.parse(fs.readFileSync(path, 'utf8'));
  pkg.resolutions['@redocly/config'] = '$REDOCLY_CONFIG_VERSION';
  pkg.overrides['@redocly/config'] = '$REDOCLY_CONFIG_VERSION';
  pkg.pnpm.overrides['@redocly/config'] = '$REDOCLY_CONFIG_VERSION';
  fs.writeFileSync(path, JSON.stringify(pkg, null, 2) + '\n');
"

echo "Current directory:"
pwd
echo
echo "Current directory content:"
ls -a
echo
echo "Target directory content:"
ls -a tests/smoke/basic/
echo
