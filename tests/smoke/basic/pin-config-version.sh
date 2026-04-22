#!/bin/bash

REDOCLY_CONFIG_VERSION=$(node -e "const fs = require('fs'); const p = JSON.parse(fs.readFileSync('./packages/core/package.json', 'utf8')); console.log(p.dependencies['@redocly/config'].replace(/\^/, ''));")

TARBALL_REF="file:./redocly-config-${REDOCLY_CONFIG_VERSION}.tgz"
echo "Pinning @redocly/config to $TARBALL_REF in smoke test overrides"

node -e "
  const fs = require('fs');
  const path = './tests/smoke/basic/package.json';
  const pkg = JSON.parse(fs.readFileSync(path, 'utf8'));
  pkg.resolutions['@redocly/config'] = '$TARBALL_REF';
  pkg.overrides['@redocly/config'] = '$TARBALL_REF';
  fs.writeFileSync(path, JSON.stringify(pkg, null, 2) + '\n');
"
