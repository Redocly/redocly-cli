#!/bin/bash

node -e "
  const fs = require('fs');
  const pkgPath = './tests/smoke/basic/package.json';
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  (pkg.dependencies ??= {}).redoc = 'latest';
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log('Added redoc@latest to smoke test dependencies');
"
