#!/bin/bash

echo
echo Running smoke test for command "$1"
echo "NPM version: $(npm -v)"
echo "Yarn version: $(yarn --version)"
echo

cd ../__tmp__
rm -rf node_modules package-lock.json yarn.lock .yarn redoc-static.html
echo "Directory content:"
ls -a
echo

# Executing the command provided as the first argument 
$($1)

# Actual smoke test
npm run l
npm run b
npm run d
if [[ "$(wc -l redoc-static.html)" == "317 redoc-static.html" ]]; then
  echo "Built correctly."
else
  echo "Built incorrectly. Received lines: $(wc -l redoc-static.html) (expected 317 lines in redoc-static.html)."
  exit 1
fi
