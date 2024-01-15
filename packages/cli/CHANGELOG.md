# @redocly/cli

## 1.6.0

### Minor Changes

- Added the ability to use `$ref` in the Redocly config file. This ability allows users to split up big config files and maintain their constituent parts independently.

### Patch Changes

- Deprecated `--lint` option in the `join` command. The options are marked for removal in a future release. Use the [lint command](https://redocly.com/docs/cli/commands/lint/) separately to lint your APIs.
- Updated @redocly/openapi-core to v1.6.0.

## 1.5.0

### Minor Changes

- Added new rule `array-parameter-serialization` to require that serialization parameters `style` and `explode` are present on array parameters.

### Patch Changes

- Deprecated lint-related options in the `bundle` command. The options are going to be removed in the subsequent releases.
  Use the [lint command](https://redocly.com/docs/cli/commands/lint/) separately to lint your APIs before bundling.
- Updated Redoc to v2.1.3.
- Updated @redocly/openapi-core to v1.5.0.

## 1.4.1

### Patch Changes

- Fixed an issue with resolving the `node-fetch` package by explicitly adding the missing dependency.
- Updated @redocly/openapi-core to v1.4.1.

## 1.4.0

### Minor Changes

- Added `recommended-strict` ruleset which uses the same rules as `recommended` but with the severity level set to `error` for all rules.
- Add JSON output support to the `split` and `join` commands.

### Patch Changes

- The `--host/-h` argument in the `preview-docs` command is now also used by the WebSocket server for hot reloading.
- Updated @redocly/openapi-core to v1.4.0.

## 1.3.0

### Minor Changes

- Added the possibility to configure the linting severity level of the configuration file for all CLI commands.
  Redocly CLI will exit with an error if there are any issues with the configuration file, and the severity is set to `error`.

### Patch Changes

- Updated @redocly/openapi-core to v1.3.0.

## 1.2.1

### Patch Changes

- Fixed an issue with nested refs in the `join` command.
- Fixed pattern for no-server-example.com rule to improve detection accuracy.
- Changed the report location for `pattern` and `notPattern` assertions to be more precise.
- Updated `unevaluatedItems` type definition to resolve either boolean or object schema per JSON Schema 2019-09 specification.
- Updated @redocly/openapi-core to v1.2.1.

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
- Updated minimum required version of Node.js to v14.19.0, NPM to v7.0.0, and removed deprecated packages.
- Updated @redocly/openapi-core to v1.1.0.

## 1.0.2

### Patch Changes

- No code changes.
- Updated @redocly/openapi-core to v1.0.2.

## 1.0.1

### Patch Changes

- Fixed the build-docs command failing when running outside the root folder.
- Updated @redocly/openapi-core to v1.0.1.
