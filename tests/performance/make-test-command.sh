#!/bin/bash

set -eo pipefail # Fail on script errors

make_hyperfine_command() {
  local cli_command="$1"
  local filename="$2"
  local commands=""
  for dep in $deps; do
    commands+="'node node_modules/$dep/bin/cli.js $cli_command' "
  done
  echo "REDOCLY_SUPPRESS_UPDATE_NOTICE=true hyperfine --warmup 2 ${commands% } --export-markdown $filename.md --export-json $filename.json"
}

# Clone the repo with test openapi files:
git clone https://github.com/Rebilly/api-definitions.git
cd api-definitions && pnpm install && cd ..

# Read tested package names
deps=$(jq -r '.dependencies | keys[]' package.json)

# Build benchmark commands for each test script
bundle_command=$(make_hyperfine_command "bundle all@latest --config=api-definitions/redocly.yaml" benchmark_bundle)
lint_command=$(make_hyperfine_command "lint all@latest --config=api-definitions/redocly.yaml --generate-ignore-file" benchmark_lint)
check_config_command=$(make_hyperfine_command "check-config --config=api-definitions/redocly.yaml --lint-config=warn" benchmark_check-config)

# Put the commands into the corresponding script entries of package.json:
updated_package_json=$(
  jq ".scripts.\"test:bundle\" = \"$bundle_command\" | .scripts.\"test:lint\" = \"$lint_command\" | .scripts.\"test:check-config\" = \"$check_config_command\"" package.json
)
printf '%s\n' "$updated_package_json" > package.json
