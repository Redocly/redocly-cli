#!/bin/bash
# Read the package.json file
package_json_path="package.json"
package_json=$(cat "$package_json_path")
# Get the current version
current_version=$(echo "$package_json" | jq -r '.version')

# Generate the new version with timestamp
if [[ $current_version == *-* ]]; then
  # Version already contains a timestamp, remove the existing timestamp
  version_without_timestamp=$(echo "$current_version" | sed 's/-[^-]*$//')
  new_version="$version_without_timestamp-$(date +"%Y%m%dT%H%M%S")"
else
  # Version does not contain a timestamp, append a new timestamp
  new_version="$current_version-$(date +"%Y%m%dT%H%M%S")"
fi

echo "New version: $new_version"
# Update the version in package.json
updated_package_json=$(echo "$package_json" | jq --arg new_version "$new_version" '.version = $new_version')

# Remove workspace: prefix
updated_package_json=$(echo "$updated_package_json" | sed 's/workspace://g')

# Save the updated package.json
echo "$updated_package_json" > "$package_json_path"
# Run pnpm build script and publish to Verdaccio
cd "$(dirname "$package_json_path")" && pnpm build && npm publish --registry http://3.236.95.236:8000

echo "$package_json" > "./package.json"

echo "Package @redocly/spot $new_version published to Verdaccio"
