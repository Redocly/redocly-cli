#!/bin/bash

REDOCLY_CONFIG_VERSION=$(node -e "const fs = require('fs'); const p = JSON.parse(fs.readFileSync('./packages/core/package.json', 'utf8')); console.log(p.dependencies['@redocly/config'].replace(/\^/, ''));")

echo "Pinning @redocly/config to $REDOCLY_CONFIG_VERSION in smoke test overrides"

node -e "
  const fs = require('fs');
  const path = './tests/smoke/basic/package.json';
  const pkg = JSON.parse(fs.readFileSync(path, 'utf8'));
  pkg.resolutions['@redocly/config'] = '$REDOCLY_CONFIG_VERSION';
  pkg.overrides['@redocly/config'] = '$REDOCLY_CONFIG_VERSION';
  fs.writeFileSync(path, JSON.stringify(pkg, null, 2) + '\n');
"
