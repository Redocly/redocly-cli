#!/bin/bash

set -eo pipefail # Fail on script errors

cd __tests__/smoke
echo
echo "Directory content:"
ls -a
echo

# Executing the command provided as the first argument 
$1

# Actual smoke test - executing the command provided as the second argument
$2 redocly-version
$2 redocly-lint
$2 redocly-bundle
$2 redocly-build-docs
# Check for broken styles (related issue: https://github.com/Redocly/redocly-cli/issues/1073)
if [[ "$(wc -l redoc-static.html)" == "294 redoc-static.html" ]]; then
  echo "Docs built correctly."
else
  echo "Docs built incorrectly. Received lines: $(wc -l redoc-static.html) (expected 294 lines in redoc-static.html)."
  exit 1
fi
