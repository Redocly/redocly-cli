---
toc:
  maxDepth: 2
---

# Redocly CLI changelog

<!-- do-not-remove -->

## 1.25.8 (2024-10-18)

### Patch Changes

- Added the `REDOCLY_SUPPRESS_UPDATE_NOTICE` environment variable so that users can skip version updates.
- Fixed bundling with the `--dereferenced` option. Previously, references to external files were not substituted with references to components, causing them to become invalid.
- Updated @redocly/openapi-core to v1.25.8.

## 1.25.7 (2024-10-16)

### Patch Changes

- Updated redoc to v2.2.0.
- Removed the support of the `x-inherit` extension for Arazzo description files.
- Updated @redocly/openapi-core to v1.25.7.

## 1.25.6 (2024-10-14)

### Patch Changes

- Changed the `x-operation` extension in Arazzo, enabling users to make requests with this extension without an API description file.
- Removed the support of the `x-parameters` extension for Arazzo description files.
- Updated @redocly/openapi-core to v1.25.6.

## 1.25.5 (2024-10-04)

### Patch Changes

- Fixed an issue where the bundle command did not resolve links in `externalValue`.
- Fixed an issue where the plugins in external NPM packages could not be resolved if the CLI package was installed globally.
- Updated @redocly/openapi-core to v1.25.5.

## 1.25.4 (2024-09-30)

### Patch Changes

- Added a warning message to the `push` and `push-status` commands to notify users about upcoming or ongoing resource deprecation.
- Updated @redocly/openapi-core to v1.25.4.

## 1.25.3 (2024-09-18)

### Patch Changes

- Updated @redocly/openapi-core to v1.25.3.

## 1.25.2 (2024-09-13)

### Patch Changes

- Fixed `camelCase` assertion for single-letter values.
- Updated @redocly/openapi-core to v1.25.2.

## 1.25.1 (2024-09-13)

### Patch Changes

- Added additional checks to `criteria-unique` Arazzo rule.
- Updated @redocly/openapi-core to v1.25.1.

## 1.25.0 (2024-09-11)

### Minor Changes

- Added a cache for resolved plugins to ensure that plugins are only instantiated once during a single execution.

### Patch Changes

- Updated @redocly/openapi-core to v1.25.0.

## 1.24.0 (2024-09-09)

### Minor Changes

- Added Spot and Arazzo rules: `no-criteria-xpath`, `no-actions-type-end`, `criteria-unique`.

### Patch Changes

- Fixed an issue where custom rules were not applied to Arazzo descriptions.
- Updated @redocly/openapi-core to v1.24.0.

## 1.23.1 (2024-09-06)

### Patch Changes

- Fixed a bug where bundling multiple API description files specified as CLI arguments, along with the `--output` option, stored the result in a single file instead of a folder.
- Updated @redocly/openapi-core to v1.23.1.

## 1.23.0 (2024-09-06)

### Minor Changes

- Added support for the `output` option in the per-API configuration so that the destination file can be specified in configuration.

### Patch Changes

- Fixed the absolute path for importing plugins in Windows.
- Added the ability to run the `eject` command without specifying components, which displays a selectable list of all available components.
- Updated @redocly/openapi-core to v1.23.0.

## 1.22.1 (2024-08-30)

### Patch Changes

- Updated @redocly/openapi-core to v1.22.1.

## 1.22.0 (2024-08-29)

### Minor Changes

- Updated the Arazzo validation types for workflows input, parameter objects, and criteria to match the specification.
- Added Arazzo rulesets so that users can customize their linting rules for this format.

### Patch Changes

- Updated @redocly/openapi-core to v1.22.0.

## 1.21.1 (2024-08-27)

### Patch Changes

- Updated @redocly/openapi-core to v1.21.1.

## 1.21.0 (2024-08-23)

### Minor Changes

- Added the `eject` and `translate` commands for use with the new Reunite-hosted product family.

### Patch Changes

- Updated @redocly/openapi-core to v1.21.0.

## 1.20.1 (2024-08-22)

### Patch Changes

- Get more helpful error messages when there's a problem importing a plugin.
- Updated @redocly/openapi-core to v1.20.1.

## 1.20.0 (2024-08-21)

### Minor Changes

- Added support for ESM plugins and importing of plugins directly from npm package: `@vendor/package/plugin.js` instead of `./node_modules/@vendor/package/plugin.js`.
- Added `info-license-strict` rule as a replacement of the `info-license-url` to support the OpenAPI 3.1 changes to allow identifier or URL license details.
- Changed plugins format to export a function instead of an object for compatibility with other Redocly products. The backwards compatibility with an old format of plugins is maintained.

### Patch Changes

- Added support for webhooks in stats and fixed a crash that occurred when tags were not included in webhooks.
- Updated @redocly/openapi-core to v1.20.0.

## 1.19.0 (2024-08-01)

### Minor Changes

- Added support for AsyncAPI 3.0 description linting.

### Patch Changes

- Fixed an issue where `patternProperties` incorrectly caused linting errors due to a missing `PatternProperties` node.
- Updated @redocly/openapi-core to v1.19.0.

## 1.18.1 (2024-07-22)

### Patch Changes

- Allowed the `theme.openapi` configuration option to accept settings specific to Redoc 2.x and earlier.
- Fixed an issue in the OpenAPI `spec` rule where `dependentSchemas` was parsed as an array.
  It is now correctly parsed as a map.
- Fixed bundling of `$refs` inside `patternProperties`.
- Updated AsyncAPI v2 typings to abide by JSON Schema draft-07 specification.
- Updated @redocly/openapi-core to v1.18.1.

## 1.18.0 (2024-07-12)

### Minor Changes

- Added support for Arazzo description linting.

### Patch Changes

- Removed `additionalItems` from OAS 3.0.x typings. This keyword is not supported by the specification.
- Updated @redocly/openapi-core to v1.18.0.

## 1.17.1 (2024-07-03)

### Patch Changes

- Added JSON Schema draft 2019-09+ validation keyword - `dependentRequired`.
- Updated @redocly/openapi-core to v1.17.1.

## 1.17.0 (2024-07-01)

### Minor Changes

- Changed resolution process to include extendedTypes and plugins before linting.

### Patch Changes

- Added support for the `contentSchema` keyword to parse as a schema instance.
- Replace path items emoji with 🔀 so the width is consistent.
- Updated @redocly/openapi-core to v1.17.0.

## 1.16.0 (2024-06-18)

### Minor Changes

- Users can run the CLI tool behind a proxy by using `HTTP_PROXY` or `HTTPS_PROXY` environment variables to configure the proxy settings.

### Patch Changes

- Updated @redocly/openapi-core to v1.16.0.

## 1.15.0 (2024-06-11)

### Minor Changes

- Made `redocly.yaml` validation consistent with the general Redocly config.

### Patch Changes

- Updated Redoc to v2.1.5.
- Fixed `no-invalid-media-type-examples`, `no-invalid-parameter-examples`, and `no-invalid-schema-examples` rules which allowed falsy example values to pass for any schema.
- Updated @redocly/openapi-core to v1.15.0.

## 1.14.0 (2024-05-29)

### Minor Changes

- Added the ability to exclude some operations or entire paths from the `security-defined` rule.

### Patch Changes

- Improved error messages.
- Updated @redocly/openapi-core to v1.14.0.

## 1.13.0 (2024-05-23)

### Minor Changes

- Added support for the linting command to output markdown format.

### Patch Changes

- Updated @redocly/openapi-core to v1.13.0.

## 1.12.2 (2024-05-09)

### Patch Changes

- Updated @redocly/openapi-core to v1.12.2.

## 1.12.1 (2024-05-09)

### Patch Changes

- Updated @redocly/openapi-core to v1.12.1.

## 1.12.0 (2024-04-25)

### Minor Changes

- Added return values for the `push` and `push-status` commands.

### Patch Changes

- Fixed handling of wildcards on Windows ([#1521](https://github.com/Redocly/redocly-cli/issues/1521)).
- Updated @redocly/openapi-core to v1.12.0.

## 1.11.0 (2024-04-04)

### Minor Changes

- Removed additional operations from the `join` command; use `lint` and/or `bundle` for operations such as `lint` and `decorate`.
- Removed lint support from the bundle command to support a wider range of use cases. Users should update to [run lint and bundle separately](https://redocly.com/docs/cli/guides/lint-and-bundle/).
- Added support for a `github-actions` output format for the `lint` command to annotate reported problems on files when used in a GitHub Actions workflow.

### Patch Changes

- Fixed [`no-invalid-media-type-examples`](https://redocly.com/docs/cli/rules/no-invalid-media-type-examples/) rule `externalValue` example validation.
- Updated @redocly/openapi-core to v1.11.0.

## 1.10.6 (2024-03-26)

### Patch Changes

- Added `check-config` command to validate a Redocly configuration file.
- Updated @redocly/openapi-core to v1.10.6.

## 1.10.5 (2024-03-19)

### Patch Changes

- Updated license text for date and organization naming accuracy.
- Updated @redocly/openapi-core to v1.10.5.

## 1.10.4 (2024-03-14)

### Patch Changes

- Fixed a problem with the `preview` command crashing on Windows by adding operating system detection for the correct `npx` executable to use.
- Updated @redocly/openapi-core to v1.10.4.

## 1.10.3 (2024-03-04)

### Patch Changes

- Reverted "Users can run the CLI tool behind a proxy by using HTTP_PROXY or HTTPS_PROXY environment variables to configure the proxy settings" temporary.
- Updated @redocly/openapi-core to v1.10.3.

## 1.10.2 (2024-03-04)

### Patch Changes

- Users can run the CLI tool behind a proxy by using `HTTP_PROXY` or `HTTPS_PROXY` environment variables to configure the proxy settings.
- Updated @redocly/openapi-core to v1.10.2.

## 1.10.1 (2024-02-29)

### Patch Changes

- Updated @redocly/openapi-core to v1.10.1.

## 1.10.0 (2024-02-29)

### Minor Changes

- Users can run the CLI tool behind a proxy by using `HTTP_PROXY` or `HTTPS_PROXY` environment variables to configure the proxy settings.

### Patch Changes

- Added inflection to the `join` command so that `--prefix-components-with-info-prop` replaces spaces with underscores to create less confusing $refs.
- Updated @redocly/openapi-core to v1.10.0.

## 1.9.1 (2024-02-20)

### Patch Changes

- Adds support for using logical AND for the security schema so that the `join` command generates the correct schema.
- Fixed a bug with resolving $refs to file names that contain the hash symbol.
- Fixed a problem where the `join` command did not process schemas containing `null` values when the `--prefix-components-with-info-prop` option was used.'
- Updated @redocly/openapi-core to v1.9.1.

## 1.9.0 (2024-02-13)

### Minor Changes

- - Removed descriptions adding for x-tagGroups for the `join` command. Descriptions in x-tagGroups are not supported and cause errors on linting.
  - Updated `info.title` to be used as a name in x-tagGroups instead of a file name for the `join` command, so you can now join files with the same names.
- Added new `no-required-schema-properties-undefined` rule to check if each required schema property is defined.

### Patch Changes

- Fixed an issue where using the `--prefix-components-with-info-prop` option with the `join` command caused `$refs` to include duplicated prefixes.
- Fixed an issue where `$ref`s ending in `#` (instead of `#/`) would break the application.
- Updated @redocly/openapi-core to v1.9.0.

## 1.8.2 (2024-02-01)

### Patch Changes

- Added markdown format option to stats command for use with GitHub job summaries.
- Fixed an issue with the `push` command, when `destination` option does not work without specifying it in `redocly.yaml`.
- Updated @redocly/openapi-core to v1.8.2.

## 1.8.1 (2024-01-29)

### Patch Changes

- Added git to the docker image, so the push command can use git metadata.
- Updated @redocly/openapi-core to v1.8.1.

## 1.8.0 (2024-01-26)

### Minor Changes

- Added a `push` and `push-status` command for use with future Redocly products.

### Patch Changes

- Updated @redocly/openapi-core to v1.8.0.

## 1.7.0 (2024-01-23)

### Minor Changes

- Added a `preview` command that starts a local preview server for Redocly projects that use products that are currently in a pre-release stage.

### Patch Changes

- Fixed an issue with resolving references after splitting API descriptions written in the json format.
- Added filename extension support for more `x-codeSamples` languages.
- Fixed a problem where the linter incorrectly returned an error for valid examples that contain references.
- Updated @redocly/openapi-core to v1.7.0.

## 1.6.0 (2023-12-21)

### Minor Changes

- Added the ability to use `$ref` in the Redocly config file. This ability allows users to split up big config files and maintain their constituent parts independently.

### Patch Changes

- Deprecated `--lint` option in the `join` command. The options are marked for removal in a future release. Use the [lint command](https://redocly.com/docs/cli/commands/lint/) separately to lint your APIs.
- Updated @redocly/openapi-core to v1.6.0.

## 1.5.0 (2023-11-29)

### Minor Changes

- Added new rule `array-parameter-serialization` to require that serialization parameters `style` and `explode` are present on array parameters.

### Patch Changes

- Deprecated lint-related options in the `bundle` command. The options are marked for removal in a future release.
  Use the [lint command](https://redocly.com/docs/cli/commands/lint/) separately to lint your APIs before bundling.
- Updated Redoc to v2.1.3.
- Updated @redocly/openapi-core to v1.5.0.

## 1.4.1 (2023-11-15)

### Patch Changes

- Fixed an issue with resolving the `node-fetch` package by explicitly adding the missing dependency.
- Updated @redocly/openapi-core to v1.4.1.

## 1.4.0 (2023-10-26)

### Minor Changes

- Added `recommended-strict` ruleset which uses the same rules as `recommended` but with the severity level set to `error` for all rules.
- Add JSON output support to the `split` and `join` commands.

### Patch Changes

- The `--host/-h` argument in the `preview-docs` command is now also used by the WebSocket server for hot reloading.
- Updated @redocly/openapi-core to v1.4.0.

## 1.3.0 (2023-10-19)

### Minor Changes

- Added the possibility to configure the linting severity level of the configuration file for all CLI commands.
  Redocly CLI exits with an error if there are any issues with the configuration file, and the severity is set to `error`.

### Patch Changes

- Updated @redocly/openapi-core to v1.3.0.

## 1.2.1 (2023-10-17)

### Patch Changes

- Fixed an issue with nested refs in the `join` command.
- Fixed pattern for no-server-example.com rule to improve detection accuracy.
- Changed the report location for `pattern` and `notPattern` assertions to be more precise.
- Updated `unevaluatedItems` type definition to resolve either boolean or object schema per JSON Schema 2019-09 specification.
- Updated @redocly/openapi-core to v1.2.1.

## 1.2.0 (2023-09-18)

### Minor Changes

- Added support for linting AsyncAPI v2 files, so that a wider range of API descriptions can use the Redocly linting workflow.

### Patch Changes

- Renamed API definition to API description for consistency.
- Updated @redocly/openapi-core to v1.2.0.

## 1.1.0 (2023-09-14)

### Minor Changes

- Added `ignoreCase` option for `tags-alphabetical` rule.
- Added `join` support for OAS 3.1 descriptions.
- Added support for Redoc v2.1.2, and aligned the dependencies for both projects.

### Patch Changes

- Fixed an issue where the `--remove-unused-components` option removed used components that were referenced as child objects.
- Updated Redocly config validation.
- Fixed the location pointer when reporting on the `no-path-trailing-slash` rule.
- Updated minimum required version of Node.js to v14.19.0, NPM to v7.0.0, and removed deprecated packages.
- Updated @redocly/openapi-core to v1.1.0.

## 1.0.2 (2023-08-07)

### Patch Changes

- No code changes.
- Updated @redocly/openapi-core to v1.0.2.

## 1.0.1 (2023-08-07)

### Patch Changes

- Fixed the build-docs command failing when running outside the root folder.
- Updated @redocly/openapi-core to v1.0.1.

## 1.0.0 (2023-07-25)

This release marks the stable version 1.0. There are no changes from previous releases.

## 1.0.0-rc.3 (2023-07-20)

### Fixes

- Fixed issue with publishing to Docker Hub (no code changes).
- Fixed smoke tests in Yarn and Docker environments.

### Changes

- Added job for testing new version (no code changes).

## 1.0.0-rc.2 (2023-07-19)

- Update package publishing process (no code changes).

## 1.0.0-rc.1 (2023-07-17)

No code changes.

## 1.0.0-beta.131 (2023-07-10)

### Fixes

- Handled aborted request in the docker and removed a redundant call.
- Resolved problem with installation failing in node 14- and yarn due to unresolved peer dependencies.

### Changes

- Removed the `cdn` option from the `build-docs` command as it was not functional.
- Updated Redocly config validation schemas.

## 1.0.0-beta.130 (2023-07-06)

### Features

- Added new rule `component-name-unique` to check for unique component names (kudos to @pboos 🎉).
- Added docker container to GitHub container registry.

### Fixes

- Fixed an issue when the `--files` option of the `push` command did not upload extra files.
- Fixed nullable schema type validation for OAS 3.1.
- Added peer dependencies to fix an issue with styles seen in the build-docs command.

### Changes

- Additional data masking for the anonymous data collection feature.
- Added fetch request timeout to prevent hanging the tool when executing commands.

## 1.0.0-beta.129 (2023-06-26)

### Features

- Added product metrics collection.

### Fixes

- Fixed build-docs command not working in Docker.
- Other stability fixes and improvements.

### Changes

- Streamlined the `push` command interface. The previous syntax also continues to work.
- Improved Redocly configuration validation.
- Documentation and messaging corrections.

## 1.0.0-beta.128 (2023-06-07)

### Features

- Resolve `$ref`s in preprocessors.
- Create the `spec-strict-refs` rule to ensure `$ref` usage is in accordance with the OpenAPI specification.

### Fixes

- Handle syntax errors from plugins.
- Apply the following regular expression, `^[a-zA-Z0-9\.\-_]+$`, only to fixed fields under components.

### Changes

- Change the prefix from `assert/` to `rule/` as a prefix for configurable rules. The `assert/` prefix continues to work with a warning of the deprecated syntax.

## 1.0.0-beta.127 (2023-05-25)

### Features

- Inform the user if a new version is available.

### Fixes

- Improved messages on wrong schemas.
- Fixed components duplication and self-referencing when bundling.
- Fixed typos.

### Changes

- Adjusted CLI arguments behavior for array-like options: it's required to specify the option multiple times to add multiple values. For example, `--skip-rule rule1 --skip-rule rule2` instead of `--skip-rule rule1 rule2`.

## 1.0.0-beta.126 (2023-05-10)

### Features

- Added new options for the `join` command: `--decorate` and `--preprocess`.

### Fixes

- Fixed a bug with OAS (`x-`) specification extensions that contain an array.
- Display an error if the API path refers to a folder.
- Fixed the `push` command not recognizing API descriptions with spaces.
- Defined default `allowedValues` in the `all` ruleset for mime-type rules.

### Changes

- Display an error if apis or rules for the `lint` command are not provided.
- Stopped executing decorators and preprocessors upon the `join` command.
- Sort top-level OAS3 keys in `bundle` and `join` commands.

## 1.0.0-beta.125 (2023-04-06)

### Features

- Added the [required-min-length-string-type-property](./rules/required-string-property-missing-min-length.md) rule that requires required properties in the API description with type `string` to have a `minLength`.

### Fixes

- Fixed an issue with `$ref` in path parameters during the `join` command.
- This release also includes various internal stability fixes and improvements.

### Changes

- Changed the arguments for assertion custom functions. Now as the third parameter, instead of a `location` object, assertion custom functions include a `ctx` object. See [Custom functions](./rules/configurable-rules.md#custom-function-example).

## 1.0.0-beta.124 (2023-03-09)

- Fixed an issue with remote file inside the lint ignore file.

## 1.0.0-beta.123 (2023-01-02)

### Fixes

- Fixed the `push` command when organization is provided in the `redocly.yaml` configuration file.

## 1.0.0-beta.122 (2023-01-26)

### Fixes

- Fixed an issue with the `push` command not working with a valid `organizationId`.

## 1.0.0-beta.121 (2023-01-25)

### Features

- Added custom output file option to the `join` command.
- Added an option to include webhooks to [operation-4xx-response](./rules/operation-4xx-response.md) rule.
- Added a new built-in decorator [info-override](./decorators/info-override.md).
- Added support for `/` as a separator which puts paths into subdirectories for each path segment with the [split command](./commands/split.md).

### Fixes

- Ignored case when inferring file extension from code sample `lang` property.

### Changes

- Moved and renamed the `features.openapi` and `features.mockServer` into the `theme` object with the names `openapi` and `mockServer`.

Before:

```yaml
features.openapi: {}
features.mockServer: {}
```

After:

```yaml
theme:
  openapi: {}
  mockServer: {}
```

## 1.0.0-beta.120 (2023-01-05)

### Fixes

- Fixed an issue where `$refs` weren't resolved inside specification extensions.

## 1.0.0-beta.119 (2023-01-03)

### Fixes

- Fixed an issue where the `spec` rule showed an error for `x-logo` properties in the 3.1 OpenAPI description.

## 1.0.0-beta.118 (2022-12-29)

### Features

- Enabled removing unused components in the config to use within the bundle command.
- Implemented special SpecExtension type `VendorExtension`.
- Added an error handler for the case when the API description file or a plugin does not exist.
- Added `media-type-examples-override` decorator.

### Fixes

- Fixed an issue where the rule spec-components-invalid-map-name is not applied for all examples and adjusted the logic behind the rule in general.

## 1.0.0-beta.116 (2022-12-7)

### Fixes

- Fixed an issue with scalar assertion failing when an object is of invalid type.

### Features

- Added Redoc vendor extensions to supported types.

## 1.0.0-beta.115 (2022-11-29)

### Features

- Added support for [`any`](./rules/configurable-rules.md#any-example) type in assertions.

### Changes

- Renamed the Docker image on [Docker Hub](https://hub.docker.com/repository/docker/redocly/cli).
- Changed assertions errors grouping.
- Removed orphaned git submodule `public_api_docs`.

## 1.0.0-beta.114 (2022-11-18)

### Features

- Added a new assertion [`notPattern`](./rules/configurable-rules.md#notpattern-example) to the custom rules.

## 1.0.0-beta.113 (2022-11-15)

### Changes

- Removed automatically adding the `recommended` configuration when there is a config defined without an `extends` list.

### Fixes

- Fixed an issue with undefined `process.cwd` in browser environment.
- Fixed an issue with `$anchors` in OpenAPI documents are not properly parsed.
- Fixed an issue with the `spec` rule not reporting on `nullable` in Schema object that don't have a `type` sibling.
- Added missing OAS2 and OAS3 list types.
- Don't show false media type example errors when a discriminator is used with the `allOf` keyword.

## 1.0.0-beta.112 (2022-11-01)

### Changes

- Changed assertions syntax and renamed to [custom rules](./rules/configurable-rules.md).
- Removed `info-description` rule.
- Removed deprecated fields suggestions in Redocly config file.

## 1.0.0-beta.111 (2022-10-10)

### Changes

- Renamed four type names for alignment with the OpenAPI specification.
  - `PathsMap` to `Paths`
  - `ResponsesMap` to `Responses`
  - `EncodingsMap` to `EncodingMap`
  - `SecuritySchemeFlows` to `OAuth2Flows`

### Features

- Added a new option `--keep-url-references` to the `bundle` command that disables bundling of absolute URL `$ref`-s.

### Fixes

- Improved location of problems produced by `security-defined` rule.
- Fixed an issue with `response-contains-header` being case-sensitive.
- Fixed an issue with `path-params-defined` rule that was not accounting for params defined on the operation level.
- Fixed an issue with `type` not being validated if it is an array.
- Fixed an issue with `apis` overrides not picking up some base values from the root config.
- Fixed an issue with api not being detected from the `apis` list if used as a file name.

## 1.0.0-beta.110 (2022-09-21)

### Features

- Added the `build-docs` command which builds Redoc API docs into a zero-dependency HTML file.
- Added the ability to upload other files and folders with the `push` command.
- Added support for custom assertions as plugins.

### Fixes

- Fixed incorrect behavior for the `no-invalid-media-type-examples` rule in combination with the `allOf` keyword.

## 1.0.0-beta.109 (2022-09-08)

### Features

- Added rfc7807 problem details rule.
- Improved error messages by adding `referenced from` information.
- Added the [`spec-components-invalid-map-name`](./rules/spec-components-invalid-map-name.md) rule for component map names validation.
- Added a new lint `--format` option: `summary`.

### Fixes

- Fixed an issue with multi-line strings in literal mode.
- Fixed an issue with multi-line Markdown with Windows-style new lines.
- Fixed the Header object type to require `content` or `schema`.
- Fixed a error message for `operation-4xx-response` rule.
- Fixed an issue with `paths` not being correctly handled by the `join` command.
- Fixed the `operation-security-defined` rule to check the security on the root and in each operation.

### Changes

- Renamed 'DefinitionRoot', 'ServerVariableMap', 'PathMap', 'CallbackMap', 'MediaTypeMap', 'ExampleMap', 'EncodingMap', 'HeaderMap', and 'LinkMap' definition node types.
- Removed the `styleguide` object from the configuration file.
- Renamed the `operation-security-defined` rule to `security-defined`.

## 1.0.0-beta.108 (2022-08-22)

### Changes

- Renamed `no-servers-empty-enum` to `no-server-variables-empty-enum` and fixed incorrect docs of `no-empty-enum-servers`.

### Features

- Add browser support for `openapi-core`.
- Allow accessing `config` field in subclasses extending `BaseResolver` class.
- Ability to create config (e.g. `redocly.yaml`) from string or object.

### Fixes

- Fixed docs for `no-server-example.com`.
- Incorrect schema description dereferenced.

## 1.0.0-beta.107 (2022-08-16)

### Changes

- Add `allowAdditionalProperties` to built-in rules and mark `disallowAdditionalProperties` as deprecated.

### Fixes

- Introduced severity level `off` for assertions.

## 1.0.0-beta.106 (2022-08-09)

### Fixes

- Now errors exit with return code `1`.

### Changes

- Renamed `lint` into `styleguide` in Redocly configuration.
- Improved naming consistency.

## 1.0.0-beta.105 (2022-07-27)

### Fixes

- Fixed bug with an invalid path to the configuration file causing issues with the ignore file.

## 1.0.0-beta.104 (2022-07-11)

### Fixes

- Fixed incorrect boolean filtering in `filter-out` rule.
- Fixed bug with tags duplication for the `join` command.
- Other internal stability fixes and improvements.

## 1.0.0-beta.103 (2022-06-27)

### Features

- Added new property `ref` to assertation object.
- Added the `--lint-config` option for the `lint` command. Use it to validate the configuration file with appropriate severity level.
- Added new built-in decorators `filter-in` and `filter-out`.

### Fixes

- Resolved an issue with the `--run-id` option for the `push` command. The `--run-id` option renamed to the `--batch-id`, added the `--batch-size` option.
- Improved types for the configuration file.

## 1.0.0-beta.102 (2022-06-09)

### Features

- The `join` command supports a new option `--without-x-tag-groups`. Use it to skip the creation and population of `x-tagGroups`.
- Added new property `requireAny` to assertation object.
- Updated types. Added `showSecuritySchemeType` and `disableTryItRequestUrlEncoding` configuration options.

### Fixes

- Fixed issue with `additionalItems` array type.

## 1.0.0-beta.101 (2022-06-09)

Broken release.

## 1.0.0-beta.100 (2022-05-27)

### Fixes

- Fixed types for `Callback` and `NamedCallbacks`.
- Fixed an issue with the `scalar-property-missing-example` built-in rule that didn't work on examples containing falsy values.

## 1.0.0-beta.99 (2022-05-25)

### Features

- Added three new built-in rules: `response-contains-header`, `response-contains-property`, `scalar-property-missing-example`.
- The `bundle` command supports a new option `--keep-url-references`. Use it to prevent Redocly CLI from resolving external URL references during bundling.
- Added `addinionalItems`, `minContains` and `maxContains` array types.

### Fixes

- Resolved an issue with escaping symbols in code sample language names (the `lang` value in the `x-codeSamples` specification extension).

## 1.0.0-beta.98 (2022-05-18)

### Features

- Updated types. Added `hideTryItPanel`, `schemaDefinitionsTagName` configuration options and `x-hideTryItPanel`, `x-tags` OpenAPI specification extensions.

## 1.0.0-beta.97 (2022-05-10)

### Features

- Added the `--public` option to the `push` command. With this option, you can upload OpenAPI descriptions and make them publicly accessible.
- Changed assertions syntax to this pattern: `assert/{assert name}`

### Fixes

- Fixed an issue with `process.*` in core package that caused crashes in client-side builds.
- Fixed `preview-docs` hot reload.

## 1.0.0-beta.96 (2022-05-06)

Technical release for changing the package name from `@redocly/openapi-cli` to `@redocly/cli`.

## 1.0.0-beta.95 (2022-05-04)

{% admonition type="warning" name="Product name change" %}
The product name has changed from OpenAPI CLI to **Redocly CLI**.

This change is reflected in all Redocly product documentation, in the npm package name (more on that in the "Deprecated" section),
and in the official project GitHub repository.

The change also affects the CLI commands. The legacy name `openapi` is supported for now, but we strongly recommend you use the new name `redocly`.
(To illustrate, if you previously used `openapi lint`, now you should use `redocly lint`).

If you encounter any issues and suspect they may be related to this change, let us know by [reporting an issue](https://github.com/Redocly/redocly-cli/issues).

{% /admonition %}

### Features

- The `lint.extends` section in the Redocly configuration file supports file paths and URLs as values. This means you can define your own lint rulesets in local or remote files, and list those files in the `extends` section. The following example shows how to do it:

```yaml
extends:
  - recommended
  - ./path/to/local/lint-ruleset.yaml
  - https://url-to-remote/lint-ruleset.yaml
```

The contents of those referenced files must correspond to the standard format used in the `rules` object to configure the rules. Here is an example `lint-ruleset.yaml` file referenced above:

```yaml
rules:
  tags-alphabetical: error
```

- The `lint` command supports a new output formatting option called `codeclimate` that you can use with the `--format` argument.

### Fixes

- Fixed an issue with resolvable scalar values not working in assertions.

### Deprecated

- Deprecated the `@redocly/openapi-cli` npm package. From this version forward, use `@redocly/cli` instead.

---

## 1.0.0-beta.94 (2022-04-12)

### Features

- The `lint` command supports using `unevaluatedProperties` as boolean in **OAS 3.1.x** and no longer reports this as an error.
- Internal changes.

---

## 1.0.0-beta.93 (2022-04-05)

### Fixes

- Resolved an issue with the `push` command skipping dependencies.

---

## 1.0.0-beta.92 (2022-04-04)

### Features

- Introduced [configurable rules](./rules/configurable-rules.md) - a new, powerful lint feature, which helps you enforce API design standards without coding (named `assertions` at the time of the release).
- The `push` command supports a new `--skip-decorator` option.

### Fixes

- Resolved an issue with `openapi preview-docs` failing during authorization.

---

## 1.0.0-beta-91 (2022-03-29)

### Features

- Added the `--separator` option to the `split` command. Use it to change the separator character that's used instead of whitespace in file names. The default is `_`, which means that after splitting, path file names look like this: "user_login.yaml", "user_logout", etc.

### Fixes

- Resolved an issue with the `bundle` command when handling files with multiple dots in the file name.

---

## 1.0.0-beta.90 (2022-03-24)

### Fixes

- Updated types to support validation of the Redocly configuration file according to the new file structure.

---

## 1.0.0-beta.89 (2022-03-21)

### Features

- Internal changes of `redocly.yaml` config structure - add new mock server options to `redocly.yaml` schema.

### Fixes

- Fixed crash when there's an empty `redocly.yaml` file.

---

## 1.0.0-beta.88 (2022-03-16)

### Features

- Internal changes of `redocly.yaml` config structure.

### Fixes

- Fixed an issue with the `lint` command highlighting the entire file when `servers` are missing in OAS3. Now it highlights only the `openapi` field, indicating an incorrect OpenAPI description.
- Fixed an issue with the `lint` command highlighting all parent values when one of the child fields has an empty value instead of highlighting the field itself.

---

## 1.0.0-beta.87 (2022-03-10)

### Fixes

- Fixed an issue with `process.env` assignment that caused crashes in client-side builds.
- Fixed an issue with `no-path-parameter` rule reporting false-positives.

---

## 1.0.0-beta.86 (2022-03-09)

### Features

- Allowed to name the config file either `.redocly.yaml` (deprecated) or `redocly.yaml`.

### Fixes

- The `spec` rule triggers an error when a parameter is missing `schema` or `content` fields.

---

## 1.0.0-beta.85 (2022-03-02)

- Internal improvements

---

## 1.0.0-beta.84 (2022-02-23)

### Fixes

- Fixed an issue with the `lint` command crashing when the `servers.url` field is empty in the OpenAPI description.
- Fixed an issue with the `lint` command crashing when an `enum` value is invalid.

---

## 1.0.0-beta.83 (2022-02-22)

### Features

- Added the `webhooks` and [x-webhooks](https://redocly.com/docs/api-reference-docs/specification-extensions/x-webhooks/#x-webhooks) support to the `split` command.

---

## 1.0.0-beta.82 (2022-02-15)

### Fixes

- Removed support for using OpenAPI CLI behind a proxy server.

---

## 1.0.0-beta.81 (2022-02-10)

### Features

- Added support for using OpenAPI CLI behind a proxy server.

### Fixes

- Fixed an issue with the `lint` command not reporting errors when `securityDefinitions.basic` contains the unsupported `additionalProperty` in OAS2.
- Fixed an issue with the `no-invalid-media-type-examples` built-in rule that didn't work on examples containing a `$ref`.
- Fixed an issue with the `lint` command incorrectly reporting boolean schemas for array items as invalid.
- Fixed an issue with `isPathParameter` failing because of an incorrect brace.

---

## 1.0.0-beta.80 (2022-01-24)

### Fixes

- Fixed an issue with date-time conversion in YAML files.
- Fixed an issue with the `oauth2-redirect.html` file being absent when served by `preview-docs` command.

---

## 1.0.0-beta.79 (2022-01-10)

### Fixes

- Fixed the `remove-x-internal` decorator to remove references to removed `x-internal` components.
- Fixed the `remove-unused-components` decorator that strips remotely referenced components.

---

## 1.0.0-beta.78 (2022-01-06)

### Features

- Added the `remove-x-internal` built-in decorator.
- Added the `--remove-unused-components` option to the `bundle` command.

---

## 1.0.0-beta.77 (2022-01-06)

### Fixes

- Fixed an issue with backslashes in `$refs` to paths with the `split` command in a Windows environment.

---

## 1.0.0-beta.76 (2021-12-28)

### Features

- Exported `mapTypeToComponent` function.

---

## 1.0.0-beta.75 (2021-12-24)

### Features

- Added the `--host` option to the `preview-docs` CLI command.

### Fixes

- Fixed an issue with continuous deployment to Docker Hub.

---

## 1.0.0-beta.74 (2021-12-22)

### Fixes

- Fixed an issue with `const` not handled correctly by the `lint` command.

---

## 1.0.0-beta.73 (2021-12-16)

### Fixes

- Resolved another backward compatibility issue with older versions of portal.

---

## 1.0.0-beta.72 (2021-12-16)

### Fixes

- Fixed another backward compatibility issue with regions: save old config key to support old portal versions.

---

## 1.0.0-beta.71 (2021-12-16)

### Fixes

- Fixed a backward compatibility issue with `REDOCLY_DOMAIN` in the EU region introduced in the previous release.

---

## 1.0.0-beta.70 (2021-12-14)

### Features

- Added support for the [region](./configuration/index.md) option with the `login`, `push`, and other commands.
- Added two new built-in rules:
  - [no-invalid-schema-examples](./rules/no-invalid-schema-examples.md)
  - [no-invalid-parameter-examples](./rules/no-invalid-parameter-examples.md)

### Fixes

- Fixed an issue with the built-in `paths-kebab-case` rule that disallowed paths with trailing slashes.
- Fixed a validation issue with the `example` property when the schema is an array.

---

## 1.0.0-beta.69 (2021-11-16)

### Features

- Implemented new `--extends` and `--metafile` options for the [bundle](./commands/bundle.md#options) command.

---

## 1.0.0-beta.68 (2021-11-15)

### Fixes

- Fixed an issue with hot reloading when running a preview of reference docs with `openapi preview-docs`.
- Fixed an issue with page refresh when pagination is set to `item` or `section`.
- Fixed an issue with inlining external schema when components' names match.
- Fixed an issue with fetching hosted schema on Windows when bundling OpenAPI descriptions.
- Fixed an issue for `no-server-trailing-slash` when server url is a root.

---

## 1.0.0-beta.67 (2021-11-02)

### Features

- Added a new built-in rule: [operation-4xx-response](./rules/operation-4xx-response.md).

---

## 1.0.0-beta.66 (2021-11-01)

### Features

- Added five new built-in rules:
  - [path-excludes-patterns](./rules/path-excludes-patterns.md)
  - [no-http-verbs-in-paths](./rules/no-http-verbs-in-paths.md)
  - [path-excludes-patterns](./rules/path-excludes-patterns.md)
  - [request-mime-type](./rules/request-mime-type.md)
  - [response-mime-type](./rules/response-mime-type.md)

### Fixes

- Fixed an issue with OAS 3.1 meta keywords reported as not expected.
- Fixed an issue with incorrect codeframe for `info-license-url` rule.
- Fixed an issue with discriminator mapping not supported in `no-invalid-media-type-examples`.
- Fixed an issue with ignore file generated in windows not working on other systems, and in Redocly Workflows.

---

## 1.0.0-beta.65 (2021-10-27)

### Features

- Added three built-in decorators - `info-description-override`, `tag-description-override`, `operation-description-override` - that let you modify your API descriptions during the bundling process. Use these decorators in the `lint` section of your `redocly.yaml` file to point OpenAPI CLI to Markdown files with custom content. That custom content replaces any existing content in the `info.description` field, and in `tags.description` and `operation.description` fields for specified tag names and operation IDs.

The following examples show how to add the decorators to the `redocly.yaml` file:

```yaml info-description-override
lint:
  decorators:
    info-description-override:
      filePath: ./my-custom-description.md
```

```yaml tag-description-override
lint:
  decorators:
    tag-description-override:
      tagNames:
        pet: ./my-custom-description.md
```

```yaml operation-description-override
lint:
  decorators:
    operation-description-override:
      operationIds:
        updatePet: ./my-custom-description.md
```

- Improved documentation for [the lint command](./commands/lint.md).

### Fixes

- Fixed the the `bundle` command to return a non-zero code when it detects an error when used with the `--lint` option.

---

## 1.0.0-beta.64 (2021-10-20)

### Fixes

- Fixed an issue with the `--format` option not working with the `bundle` command.

- Fixed a validation issue with the non-string `openapi` value in API descriptions. The `lint` command now warns if the value is not string instead of crashing.

---

## 1.0.0-beta.63 (2021-10-12)

### Features

- Upgraded the `js-yaml` package from v.3 to v.4 with YAML 1.2 support. This resolves issues with parsing timestamps and example strings with leading zeros in YAML.

---

## 1.0.0-beta.62 (2021-09-30)

### Fixes

- Resolved an issue with the `--max-problems` option that was not working with the `bundle` command.

---

## 1.0.0-beta.61 (2021-09-21)

### Features

- Improved validation of values for the following fields in the Schema Object: `multipleOf, maxLength, minLength, maxItems, minItems, maxProperties, minProperties`.

---

## 1.0.0-beta.60 (2021-09-20)

### Fixes

- Fixed an issue with the `join` command crashing when trying to resolve $ref.

---

## 1.0.0-beta.59 (2021-09-15)

### Fixes

- Resolved an issue with the `preview-docs` command not working when running `openapi-cli` in a Docker container.

- Improved the security of local documentation previews by removing query parameters from the request URL.

---

## 1.0.0-beta.58 (2021-09-02)

### Fixes

- Internal improvements to configuration types.

---

## 1.0.0-beta.57 (2021-09-01)

### Fixes

- Simplified the login check query to improve performance.

---

## 1.0.0-beta.56 (2021-09-01)

### Features

- Added a function for linting the `redocly.yaml` configuration file.

- Published [the OpenAPI CLI quickstart guide](quickstart.md) as part of our Google Season of Docs 2021 project.

---

## 1.0.0-beta.55 (2021-08-20)

### Features

- Updated and improved the [introductory content](index.md) and [installation instructions](installation.md) for OpenAPI CLI as part of our Google Season of Docs 2021 project.

- Implemented improvements to the internal CD process.

---

## 1.0.0-beta.54 (2021-07-19)

- Internal changes.

---

## 1.0.0-beta.53 (2021-07-02)

### Fixes

- Resolved an issue with transitive $ref resolution in the JSON schema validator.

- If the JSON schema validator crashes, OpenAPI CLI reports the problem in the output instead of crashing itself.

---

## 1.0.0-beta.52 (2021-07-01)

### Fixes

- The `operation-operationId` rule no longer triggers a warning when one or more operations in the `callbacks` object don't have `operationId` defined.

---

## 1.0.0-beta.51 (2021-06-30)

### Features

- Our [official OpenAPI CLI documentation](https://redocly.com/docs/cli/) is now open-source! 🥳 You can find the source of all pages published on our website in the `docs` folder of the [openapi-cli repository](https://github.com/Redocly/redocly-cli/tree/main/docs). We invite you to help us improve the documentation and make it more usable for everyone. Please make sure to always follow our [Code of conduct](https://redocly.com/code-of-conduct/) in all your contributions.

- Implemented support for OpenAPI 3.1 in `typeExtension` plugins.

### Fixes

- Resolved a crash caused when processing properties with the `null` value.

- Resolved a "Maximum call stack size exceeded" issue in the JSON schema validator caused by recursive `oneOf`.

---

## 1.0.0-beta.50 (2021-06-08)

### Fixes

- Implemented improvements to the `openapi-cli` package to reduce the size of the browser bundle.

---

## 1.0.0-beta.49 (2021-06-01)

### Fixes

- Removed unused keywords in OpenAPI 3.1.

- Resolved an issue with the `openapi bundle` command failing because of the missing `js-yaml` dependency.

---

## 1.0.0-beta.48 (2021-05-25)

### Fixes

- Resolved an issue with the plugin ID being prefixed to all rules, preprocessors and decorators multiple times (for example, when using the `preview-docs` command and changing configuration files).

---

## 1.0.0-beta.47 (2021-05-21)

### Features

- The `bundle` command now supports an optional `--lint` parameter.

### Fixes

- Improved the error messages for `kebab-case` and implemented detection of `snake_case` usage in paths.

- The `join` command does not overwrite an existing `x-displayName` of a tag with the tag's `name` property.

---

## 1.0.0-beta.46 (2021-05-17)

### Features

- Implemented support for [OpenAPI 3.1](https://github.com/OAI/OpenAPI-Specification/releases/tag/3.1.0). You can now lint, validate, and bundle your OAS 3.1 descriptions with OpenAPI CLI.

---

## 1.0.0-beta.45 (2021-05-09)

### Fixes

- Resolved a validation issue for `enum` items with the nullable property. Validation errors are no longer reported when `nullable: true` for `enum` items that contain a `null` value.

---

## 1.0.0-beta.44 (2021-04-12)

### Fixes

- The `browser` field in `package.json` is now set to simplify using `openapi-core` in browser-based builds.

---

## 1.0.0-beta.43 (2021-04-09)

### Fixes

- The root API description document is now parsed in all cases, even if it doesn't report the correct MIME type or doesn't use any of the supported file extensions.

---

## 1.0.0-beta.42 (2021-04-06)

### Fixes

- Improved `openapi-core` so that it can be used within our other projects including Redoc, Reference docs, and Developer portal.

---

## 1.0.0-beta.41 (2021-04-02)

### Fixes

- Resolved an issue with the `--dereferenced` CLI option not functioning properly.

---

## 1.0.0-beta.40 (2021-03-31)

### Fixes

- Resolved an issue where transitive $refs that span multiple files would crash the validation in some cases.

---

## 1.0.0-beta.39 (2021-03-26)

### Fixes

- Resolved a hot-reloading issue with the `preview-docs` command. It now automatically reloads the docs in the browser when you make live changes to an OpenAPI description.

---

## 1.0.0-beta.38 (2021-03-20)

### Fixes

- Exported a helper function from `openapi-core` and implemented defaults for some functions to improve integration with the Developer portal.

---

## 1.0.0-beta.37 (2021-03-16)

### Fixes

- Implemented error handling for failed file uploads when using the `push` command. The command now displays success/failure messages in the output.

---

## 1.0.0-beta.36 (2021-03-15)

### Features

- Source type was changed from `FILE` to `CICD` to support integration with the new CI/CD source in Workflows.

---

## 1.0.0-beta.35 (2021-03-12)

### Features

- OpenAPI CLI now has tab completion for global installations. Run `openapi completion` for instructions to set it up in your environment.

---

## 1.0.0-beta.34 (2021-03-10)

### Features

- OpenAPI CLI now has an official Docker image! You can get it from [Docker Hub](https://hub.docker.com/repository/docker/redocly/openapi-cli).

---

## 1.0.0-beta.33 (2021-03-10)

### Features

- You can now use the `--verbose` parameter with the `login` command to show a detailed error trace (if any). Detailed error output is not displayed by default for this command.

---

## 1.0.0-beta.32 (2021-02-25)

### Features

- The "access token" has been renamed to "API key" in the output of relevant OpenAPI CLI commands (`login`, `push`) to make it clearer what information the users must provide.

- For improved security, the API key is now hidden (masked) when the user provides it in the terminal, and it's not logged in the user's history.

---

## 1.0.0-beta.31 (2021-01-25)

### Features

- The `bundle` method is now able to accept `Document` directly in openapi-core.

---

## 1.0.0-beta.30 (2021-01-25)

### Features

- OpenAPI CLI now automatically resolves all $refs by default, even in places where they are not allowed by the specification ("incorrect $refs"). This functionality can be disabled for examples by setting `doNotResolveExamples` to `true` in `redocly.yaml`.

---

## 1.0.0-beta.29 (2021-01-13)

### Fixes

- Fixed an issue with incorrect base directory when resolving transitive `$refs`.

---

## 1.0.0-beta.28 (2021-01-09)

### Fixes

- Resolved an issue with nested filepaths that caused the `push` command to upload files to the wrong path when used on Windows systems.

---

## 1.0.0-beta.27 (2021-01-06)

### Features

- A new command called `push` is now supported by OpenAPI CLI. With this command, you can upload your API descriptions and associated files, and set up your own CI pipeline for updating API descriptions without granting Redocly Workflows access to your repositories.

### Fixes

- Resolved an issue that prevented using the `.` (dot) symbol in version names with the `push` command.

---

## 1.0.0-beta.25 (2020-11-27)

### Fixes

- Resolved an issue with `assert-node-version` using the wrong path.

- OpenAPI CLI bundles the API description before gathering stats.

---

## 1.0.0-beta.23 (2020-11-24)

### Fixes

- Resolved issues with tag logic and tag display names for the `join` command.

- Refactored CLI command handlers.

---

## 1.0.0-beta.22 (2020-11-16)

### Features

- A new command called `join` is now available in OpenAPI CLI. Use it to combine two or more API description files into one. The resulting file optionally helps distinguish the origin of OpenAPI objects and properties by appending custom prefixes to them. Note that this command is considered experimental; meaning, it's still a work in progress.

---

## 1.0.0-beta.19 (2020-11-13)

### Features

- The previously single OpenAPI CLI package has been split into two: `openapi-cli` and `openapi-core`.

---

## 1.0.0-beta.18 (2020-10-19)

### Features

- OpenAPI CLI now supports the `split` command, which you can use to create a multi-file structure out of an API description file by extracting referenced parts into standalone, separate files. The command doesn't support OAS 2.

### Fixes

- Resolved an issue with counting operation tags in the `stats` command.

---

## 1.0.0-beta-16 (2020-09-28)

### Features

- A new command called `stats` has been implemented. It provides statistics about the structure of one or more API description files, and lets you choose the format in which the statistics are presented.

### Fixes

- Resolved an issue with the `glob` library by installing the missing package.

---

## 1.0.0-beta-15 (2020-09-25)

### Fixes

- Resolved an issue with the extended regex path which was missing the dot symbol.

- Added support for non-compatible globbing shells.

---

## 1.0.0-beta-14 (2020-09-14)

### Fixes

- Added the missing label definition for `x-codeSamples` and enabled `x-codeSamples` for OAS 2.

---

## 1.0.0-beta-13 (2020-09-13)

### Fixes

- Fixed the required field name for `openIdConnectUrl`.

- Resolved an issue with detecting duplicated plugin IDs, and added a warning that plugin IDs must be unique.

- Adedd `engines` and `engineStrict` to `package.json`.

- Implemented better handling and error messages for invalid severity values.

---

## 1.0.0-beta-12 (2020-09-08)

### Fixes

- Previously, OpenAPI CLI tried to use `/` instead of `\` for file path splitting on Windows machines. The issue has been resolved by implementing platform-specific separator usage.

---

## 1.0.0-beta-11 (2020-09-03)

### Fixes

- Resolved an issue with missing support for external plugins in the bundled version.

---

## 1.0.0-beta.10 (2020-08-31)

### Fixes

- Fixed a crash that happened when attempting to resolve back-references.

- The version number of OpenAPI CLI is now printed in the JSON output.

---

## 1.0.0-beta.9 (2020-08-20)

### Features

- The `--format` option now supports JSON as one of the output formats you can choose when using OpenAPI CLI commands.

- Bundling and uploading are now part of the build process.

- Warnings and errors are now displayed as separate counts in JSON output.

- All parts of a pointer are now used to generate unique component names when needed.

- Added support for linting `x-webhooks`, which is a forward-compatibility vendor extension for `webhooks` from OpenAPI 3.1.

### Fixes

- Removed an extra blank line that was printed when no rules were ignored.

- Resolved an issue with missing types for `OasDecorator` and `Oas3Decorator`.

- Resolved a tag syntax error when deploying to Workflows.

- Relative paths are now used for JSON output.

---

## 1.0.0-beta.8 (2020-07-30)

### Fixes

- Added mime-type handling for remote docs.

---

## 1.0.0-beta-7 (2020-07-26)

### Fixes

- Fixed the callbacks type definition.

- Fixed invalid component names for some components.

- Resolved an issue with bundling local references.

- Resolved a minor issue where the help message displayed references to the `registry:login` command instead of the `login` command.

---

## 1.0.0-beta.5 (2020-07-21)

### Fixes

- Fixed invalid unescape and `decodeURIComponent`.

- Updated the `extends` parameter logic to allow configuration overrides.

- Improved handling logic and error message when the input file is not an OpenAPI document.

---

## 1.0.0-beta.4 (2020-07-14)

### Fixes

- Resolved an issue with detecting output file extension without an entrypoint.

- Resolved an issue with the `preview-docs` command failing to automatically select the first description from the `apiDefinitions` section of the configuration file when used without arguments.

- Fixed an issue with relative paths for entrypoints from external configuration files.

---

## 1.0.0-beta.3 (2020-07-10)

### Fixes

- The `default.hbs` file is now copied to the build directory.

- Resolved an issue with the preview functionality failing to access `watcher`.

---

## 1.0.0-beta.2 (2020-07-09)

### Fixes

- Resolved an issue with the `no-path-trailing-slash` rule showing errors for the wrong location and path.

- Fixed a transitive resolve issue.

---

## 1.0.0-beta.1 (2020-07-09)

First beta release!
