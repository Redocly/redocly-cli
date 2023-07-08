#!/bin/bash

echo
echo Running smoke test for command "$1"
echo "NPM version: $(npm -v)"
echo "Yarn version: $(yarn --version)"
echo

cd __tests__/smoke

echo "Directory content:"
ls -a
echo

# Executing the command provided as the first argument 
$($1)

# Actual smoke test
npm run l
npm run b
npm run d
# Check for broken styles (related issue: https://github.com/Redocly/redocly-cli/issues/1073)
if [[ "$(wc -l redoc-static.html)" == "317 redoc-static.html" ]]; then
  echo "Docs built correctly."
else
  echo "Docs built incorrectly. Received lines: $(wc -l redoc-static.html) (expected 317 lines in redoc-static.html)."
  exit 1
fi
