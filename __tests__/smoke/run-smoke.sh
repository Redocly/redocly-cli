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
$2 redocly-respect

# Check for broken styles when building docs (related issue: https://github.com/Redocly/redocly-cli/issues/1073)
echo "Checking docs for issues..."
diff pre-built/redoc.html redoc-static.html -u
echo "✅ Docs built correctly."

# Check for broken $refs (or other issues) in the split files, especially on Windows (it will fail on a difference)
echo "Checking split files for issues..."
diff -r pre-split output/split -u
echo "✅ Files split correctly."