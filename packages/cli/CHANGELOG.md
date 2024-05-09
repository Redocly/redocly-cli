# @redocly/cli

## 1.12.2

### Patch Changes

- Updated @redocly/openapi-core to v1.12.2.

## 1.12.1

### Patch Changes

- Updated @redocly/openapi-core to v1.12.1.

## 1.12.0

### Minor Changes

- Added return values for the `push` and `push-status` commands.

### Patch Changes

- Fixed handling of wildcards on Windows ([#1521](https://github.com/Redocly/redocly-cli/issues/1521)).
- Updated @redocly/openapi-core to v1.12.0.

## 1.11.0

### Minor Changes

- Removed additional operations from the `join` command; use `lint` and/or `bundle` for operations such as `lint` and `decorate`.
- Removed lint support from the bundle command to support a wider range of use cases. Users should update to [run lint and bundle separately](https://redocly.com/docs/cli/guides/lint-and-bundle/).
- Added support for a `github-actions` output format for the `lint` command to annotate reported problems on files when used in a GitHub Actions workflow.

### Patch Changes

- Fixed [`no-invalid-media-type-examples`](https://redocly.com/docs/cli/rules/no-invalid-media-type-examples/) rule `externalValue` example validation.
- Updated @redocly/openapi-core to v1.11.0.

## 1.10.6

### Patch Changes

- Added `check-config` command to validate a Redocly configuration file.
- Updated @redocly/openapi-core to v1.10.6.

## 1.10.5

### Patch Changes

- Updated license text for date and organization naming accuracy.
- Updated @redocly/openapi-core to v1.10.5.

## 1.10.4

### Patch Changes

- Fixed a problem with the `preview` command crashing on Windows by adding operating system detection for the correct `npx` executable to use.
- Updated @redocly/openapi-core to v1.10.4.

## 1.10.3

### Patch Changes

- Reverted "Users can run the CLI tool behind a proxy by using HTTP_PROXY or HTTPS_PROXY environment variables to configure the proxy settings" temporary.
- Updated @redocly/openapi-core to v1.10.3.

## 1.10.2

### Patch Changes

- Users can run the CLI tool behind a proxy by using `HTTP_PROXY` or `HTTPS_PROXY` environment variables to configure the proxy settings.
- Updated @redocly/openapi-core to v1.10.2.

## 1.10.1

### Patch Changes

- Updated @redocly/openapi-core to v1.10.1.

## 1.10.0

### Minor Changes

- Users can run the CLI tool behind a proxy by using `HTTP_PROXY` or `HTTPS_PROXY` environment variables to configure the proxy settings.

### Patch Changes

- Added inflection to the `join` command so that `--prefix-components-with-info-prop` replaces spaces with underscores to create less confusing $refs.
- Updated @redocly/openapi-core to v1.10.0.

## 1.9.1

### Patch Changes

- Adds support for using logical AND for the security schema so that the `join` command generates the correct schema.
- Fixed a bug with resolving $refs to file names that contain the hash symbol.
- Fixed a problem where the `join` command did not process schemas containing `null` values when the `--prefix-components-with-info-prop` option was used.'
- Updated @redocly/openapi-core to v1.9.1.

## 1.9.0

### Minor Changes

- - Removed descriptions adding for x-tagGroups for the `join` command. Descriptions in x-tagGroups are not supported and cause errors on linting.
  - Updated `info.title` to be used as a name in x-tagGroups instead of a file name for the `join` command, so you can now join files with the same names.
- Added new `no-required-schema-properties-undefined` rule to check if each required schema property is defined.

### Patch Changes

- Fixed an issue where using the `--prefix-components-with-info-prop` option with the `join` command caused `$refs` to include duplicated prefixes.
- Fixed an issue where `$ref`s ending in `#` (instead of `#/`) would break the application.
- Updated @redocly/openapi-core to v1.9.0.

## 1.8.2

### Patch Changes

- Added markdown format option to stats command for use with GitHub job summaries.
- Fixed an issue with the `push` command, when `destination` option does not work without specifying it in `redocly.yaml`.
- Updated @redocly/openapi-core to v1.8.2.

## 1.8.1

### Patch Changes

- Added git to the docker image, so the push command can use git metadata.
- Updated @redocly/openapi-core to v1.8.1.

## 1.8.0

### Minor Changes

- Added a `push` and `push-status` command for use with future Redocly products.

### Patch Changes

- Updated @redocly/openapi-core to v1.8.0.

## 1.7.0

### Minor Changes

- Added a `preview` command that starts a local preview server for Redocly projects that use products that are currently in a pre-release stage.

### Patch Changes

- Fixed an issue with resolving references after splitting API descriptions written in the json format.
- Added filename extension support for more `x-codeSamples` languages.
- Fixed a problem where the linter incorrectly returned an error for valid examples that contain references.
- Updated @redocly/openapi-core to v1.7.0.

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
