#!/bin/bash

node -e "
  const fs = require('fs');
  const core = JSON.parse(fs.readFileSync('./packages/core/package.json', 'utf8'));
  const pkgPath = './tests/smoke/basic/package.json';
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

  const PINNED = ['@redocly/config', '@redocly/ajv'];

  for (const name of PINNED) {
    const version = core.dependencies[name].replace(/^[\^~]/, '');
    console.log('Pinning ' + name + ' to ' + version + ' in smoke test resolutions');
    (pkg.resolutions ??= {})[name] = version;
  }

  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
"
