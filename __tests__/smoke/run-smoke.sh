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
$2 redocly-split

# Check for broken styles when building docs (related issue: https://github.com/Redocly/redocly-cli/issues/1073)
echo "Checking docs for issues..."
if [[ "$(wc -l redoc-static.html)" == "324 redoc-static.html" ]]; then
  echo "✅ Docs built correctly."
else
  echo "❌ Docs built incorrectly. Received lines: $(wc -l redoc-static.html) (expected 324 lines in redoc-static.html)."
  exit 1
fi

# Check for broken $refs (or other issues) in the split files, especially on Windows (it will fail on a difference)
echo "Checking split files for issues..."
diff -r pre-split output/split
echo "✅ Files split correctly."
