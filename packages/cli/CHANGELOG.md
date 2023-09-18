# @redocly/cli

## 1.2.0

### Minor Changes

- Added support for linting AsyncAPI v2 files, so that a wider range of API descriptions can use the Redocly linting workflow.

### Patch Changes

- Renamed API definition to API description for consistency.
- Updated @redocly/openapi-core to v1.2.0.

## 1.1.0

### Minor Changes

- Added `ignoreCase` option for `tags-alphabetical` rule.
- Added `join` support for OAS 3.1 definitions.
- Added support for Redoc v2.1.2, and aligned the dependencies for both projects.

### Patch Changes

- Fixed an issue where the `--remove-unused-components` option removed used components that were referenced as child objects.
- Updated Redocly config validation.
- Fixed the location pointer when reporting on the `no-path-trailing-slash` rule.
- Updated minimum required version of Node.js to v14 and removed deprecated packages.
- Updated @redocly/openapi-core to v1.1.0.

## 1.0.2

### Patch Changes

- No code changes.
- Updated @redocly/openapi-core to v1.0.2.

## 1.0.1

### Patch Changes

- Fixed the build-docs command failing when running outside the root folder.
- Updated @redocly/openapi-core to v1.0.1.
