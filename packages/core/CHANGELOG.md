# @redocly/openapi-core

## 2.15.2

### Patch Changes

- Fixed an issue where improperly structured OpenAPI examples caused the linter to fail.

## 2.15.1

### Patch Changes

- Updated @redocly/config to v0.41.4.
- Added `description` and `documentationLink` properties to NodeTypes.
  Renamed Redocly configuration types to better reflect their purpose and relations.
- Updated @redocly/config to v0.41.3.

## 2.15.0

### Patch Changes

- Fixed an issue where `.redocly.lint-ignore.yaml` was not loaded in browser environments.

## 2.14.9

### Patch Changes

- Revert: fixed an issue where `.redocly.lint-ignore.yaml` was not loaded in browser environments.

## 2.14.8

### Patch Changes

- Allowed `x-query` operations names in OpenAPI 3.0 and 3.1 similar to `query` in OpenAPI 3.2.
- Fixed an issue where multi-line lint error messages could break Markdown formatting.

## 2.14.7

### Patch Changes

- Fixed an issue where the `no-invalid-media-type-examples`, `no-invalid-parameter-examples`, and `no-invalid-schema-examples` would not trigger warnings when an example defined in a schema.

## 2.14.6

### Patch Changes

- Fixed an issue where `.redocly.lint-ignore.yaml` was not loaded in browser environments.

## 2.14.5

### Patch Changes

- Updated @redocly/config to v0.41.2.
- Added an `ajv` npm alias dependency to satisfy peer dependency requirements and prevent installation warnings.

## 2.14.4

## 2.14.3

## 2.14.2

### Patch Changes

- Improved overall performance by skipping unnecessary JSON pointer escaping and unescaping.

## 2.14.1

### Patch Changes

- Fixed an issue where JSON Pointers containing special characters (like `%`) were not properly URI-encoded.
  When these pointers were used as URI identifiers, they caused validation errors with properties containing percent signs or other special characters.

## 2.14.0

### Patch Changes

- Updated @redocly/config to v0.41.1.

## 2.13.0

### Minor Changes

- Implemented basic support for OpenRPC specification.

## 2.12.7

## 2.12.6

### Patch Changes

- Fixed `path-params-defined` rule to correctly skip parameters defined through `$ref`.

## 2.12.5

### Patch Changes

- Updated @redocly/config to v0.41.0.

## 2.12.4

### Patch Changes

- Fixed false positive reports for path parameters in callback operations reported by the `path-parameters-defined` rule.

## 2.12.3

## 2.12.2

## 2.12.1

### Patch Changes

- Updated `@redocly/ajv` to `v8.17.1` and `ajv-formats` to `v3.0.1`.

## 2.12.0

### Minor Changes

- Added OpenAPI 3.2 XML modeling support.

### Patch Changes

- Fixed an issue where the `no-required-schema-properties-undefined` caused a crash when encountering unresolved `$ref`s.
- Updated @redocly/config to v0.40.0.

## 2.11.1

### Patch Changes

- Updated @redocly/config to v0.38.0.
- Fixed an issue where the content of `$ref`s inside example values was erroneously resolved during bundling and linting.
- Fixed `no-invalid-media-type-examples` for schemas using `anyOf`/`oneOf`.

## 2.11.0

### Minor Changes

- Added `REDOCLY_CLI_LINT_MAX_SUGGESTIONS` environment variable to limit displayed suggestions (default: 5).

### Patch Changes

- Updated @redocly/config to v0.37.0.

## 2.10.0

### Minor Changes

- Added support for message placeholders in custom rule error messages.

## 2.9.0

### Minor Changes

- Added support for `schemeName` in `x-security` at the workflow level (Arazzo). Added new lint rules: `arazzo/no-x-security-both-scheme-and-scheme-name` and `arazzo/x-security-scheme-name-link`. Updated core configs to include new rules.

### Patch Changes

- Updated @redocly/config to v0.36.2.

## 2.8.0

### Minor Changes

- Added the `no-invalid-schema-examples` and `no-invalid-parameter-examples` to the `recommended` ruleset.
  Added the `no-duplicated-tag-names` to the `spec` ruleset.

## 2.7.1

### Patch Changes

- Fixed an issue where `no-required-schema-properties-undefined` rule did not evaluate properties in `any` and `oneOf`.
- Fixed an issue where references were not resolved when used inside other properties alongside the `$ref` keyword.

## 2.7.0

### Minor Changes

- Added new `bundleOas` export: a lightweight function for bundling OpenAPI specifications.

## 2.6.0

### Minor Changes

- Added new rules for validating OpenAPI 3.2 description files: `spec-no-invalid-tag-parents`, `spec-example-values`, `spec-discriminator-defaultMapping`, and `spec-no-invalid-encoding-combinations`.
  Deprecated the `no-example-value-and-externalValue` rule in favor of `spec-example-values`.

### Patch Changes

- Fixed an issue where the `bundle` command did not substitute self-references with local references.

## 2.5.1

### Patch Changes

- Fixed an issue where the `no-http-verbs-in-paths` rule was incorrectly flagging path names containing the verb `query`.

## 2.5.0

## 2.4.0

## 2.3.1

### Patch Changes

- Arazzo decorators and preprocessors now merge both root and Arazzo-specific config, ensuring all relevant settings are applied.

## 2.3.0

### Minor Changes

- Added basic support for **OpenAPI 3.2** specification.

## 2.2.3

### Patch Changes

- Fixed an issue where the Respect workflow separator did not render correctly in GitHub CI environments.

## 2.2.2

### Patch Changes

- Resolved an issue with CLI dependencies to ensure proper package resolution.

## 2.2.1

### Patch Changes

- Fixed an issue where the `remove-unused-components` decorator was not functioning when configured at the API level.

## 2.2.0

## 2.1.5

## 2.1.4

### Patch Changes

- Fixed undefined variable used in the `remove-unused-components` decorator, which prevented an invalid reference error from being reported.

## 2.1.3

### Patch Changes

- Updated @redocly/config to v0.31.0.

## 2.1.2

### Patch Changes

- Updated @redocly/config to v0.30.0.

## 2.1.1

### Patch Changes

- Added support for lint plugins in the browser environment.

## 2.1.0

### Patch Changes

- Fixed an issue where wildcard file patterns were not recognized in the Docker image.
- Exposed additional type definitions, making it easier for custom plugin authors to write and maintain custom rules and visitors.

## 2.0.8

### Patch Changes

- Updated @redocly/config to v0.29.0.

## 2.0.7

## 2.0.6

### Patch Changes

- Fixed an issue where files specified in decorators parameters were not always resolved correctly.
  The resolution logic now properly locates the specified files relative to the config file for `info-description-override`, `media-type-examples-override`, `operation-description-override`, and `tag-description-override` decorators.

## 2.0.5

### Patch Changes

- Fixed an issue where the root config was not properly merged with the `apis` config.
- Resolved an issue that caused configuration parsing to fail when the config value was set to `null`.

## 2.0.4

### Patch Changes

- Updated @redocly/config to v0.28.0.

## 2.0.3

### Patch Changes

- Fixed `$ref`s resolution for metadata-schema in `redocly.yaml`.
- Fixed binary response data in `Respect` results by properly encoding it as base64.

## 2.0.2

## 2.0.1

### Patch Changes

- Fixed an issue where the `no-required-schema-properties-undefined` rule incorrectly resolved nested `$ref`s relative to the file in which they were defined.

## 2.0.0

### Major Changes

- Removed backward compatibility for the `spec` rule. Use `struct` instead.
- Removed support for the deprecated `apiDefinitions` option in the Redocly config. Use `apis` instead.
  Removed the `labels` field within the `apis` section, which was associated with the legacy Redocly API Registry product.
- Replaced the `SpecVersion`, `SpecMajorVersion`, `OPENAPI3_METHOD`, and `OPENAPI3_COMPONENT` enums with types for improved flexibility and type safety.
  Removed the unused `OasVersion` enum.
- Removed support for default config file names other than `redocly.yaml`.
- Removed support for the deprecated `features.openapi` and `features.mockServer` configuration options. Use `openapi` and `mockServer` directly instead.
- Removed backward compatibility for the deprecated `lint` and `styleguide` options in the Redocly config.
  Use `rules`, `decorators` and other related options on the root level instead.
- Removed the deprecated `disallowAdditionalProperties` option support in rules. Use `allowAdditionalProperties` instead.
- Removed support for the deprecated `theme` property of Redocly config.
  All the properties of `theme` are now available in the config root.
- Removed the deprecated `path-excludes-patterns` and `info-license-url` rules.
- Removed the deprecated `undefined` assertion. Use `defined` instead.
- Removed support for the legacy Redocly API Registry in favor of the new Reunite platform.
  Reunite provides improved API management capabilities and better integration with Redocly's tooling ecosystem.
  Migrated the `login` and `push` commands to work exclusively with Reunite.
  Removed the `preview-docs` command as part of platform modernization.
  Use the `preview` command instead.
- Removed support for the deprecated `referenceDocs` option, which was related to the legacy Reference docs product.
- Added support for `extends` bundling and array-based plugin configuration.
  Fixed the extends order in the configuration.
- Removed support for the deprecated `assert/` prefix in configurable rules. Use `rule/` prefix instead.
- Migrated the codebase to ES Modules from CommonJS, bringing improved code organization and better support for modern JavaScript features.
  Update to Node.js version 20.19.0+, 22.12.0+, or 23+.
- Streamlined Redocly configuration interfaces for improved developer experience.
  Removed `StyleguideConfig` class in favor of the unified `Config` class.
  Removed `getMergedConfig` function - use `Config.forAlias()` method instead to retrieve API-specific configurations.

### Minor Changes

- Added `x-security` extension for Respect that enables secure handling of authentication in Arazzo workflows.
  Use this extension to:

  - Define security schemes at the step level using either predefined schemes or inline definitions
  - Pass values of secrets (passwords, tokens, API keys)
  - Support multiple authentication types including API Key (query, header, or cookie), Basic Authentication, Bearer Token, Digest Authentication, OAuth2, and OpenID Connect
  - Automatically transform security parameters into appropriate HTTP headers or query parameters

- Added validation for JSON Schema format.
- Extracted `nullable` validation from the `struct` rule into a new `nullable-type-sibling` rule for OpenAPI 3.0. This allows users to disable `nullable` validation separately from other structural checks.
- Configured the `spec` ruleset for OpenAPI, AsyncAPI, Arazzo, and Overlay specifications.
  This ruleset is designed to strictly follow the specifications.
- Added the `no-duplicated-tag-names` rule to check for duplications in the `tags` field in API descriptions.
- Enabled `no-required-schema-properties-undefined`, `no-schema-type-mismatch`, and `no-enum-type-mismatch` rules for **AsyncAPI** and **Arazzo** specifications.
  Adjusted the rules' severities in the `recommended` and `minimal` rulesets. Refer to the following table:

  | Rule \ Ruleset                          | recommended       | minimal         |
  | --------------------------------------- | ----------------- | --------------- |
  | no-required-schema-properties-undefined | `off` -> `warn`   | `off` -> `warn` |
  | no-enum-type-mismatch                   | `error`           | `warn`          |
  | no-schema-type-mismatch                 | `warn` -> `error` | `off` -> `warn` |

### Patch Changes

- Improved performance of configuration parsing.
- Updated @redocly/config to v0.26.4.
- Updated @redocly/config to v0.24.3.
- Fixed an issue where the `ignoreLastPathSegment` option of the `path-segment-plural` rule had no effect if the path contained only one segment, resulting in an error.
- Fixed plugins validation in config files referenced in the `extends` section.
- Refactored `@redocly/respect-core` to eliminate Node.js-specific dependencies, improving cross-platform compatibility.
- Updated @redocly/config to v0.24.1.
- Fixed an issue where the config resolver grouped assertions instead of returning unchanged rules.
- Fixed Redocly CLI to correctly read `residency` from the Redocly configuration file.
- Fixed incorrect validation logic for the `constructor` property.

## 2.0.0-next.10

### Major Changes

- Removed support for the deprecated `theme` property of Redocly config.
  All the properties of `theme` are now available in the config root.

## 2.0.0-next.9

### Major Changes

- Replaced the `SpecVersion`, `SpecMajorVersion`, `OPENAPI3_METHOD`, and `OPENAPI3_COMPONENT` enums with types for improved flexibility and type safety.
  Removed the unused `OasVersion` enum.

### Patch Changes

- Refactored `@redocly/respect-core` to eliminate Node.js-specific dependencies, improving cross-platform compatibility.

## 2.0.0-next.8

### Major Changes

- Removed support for default config file names other than `redocly.yaml`.

### Minor Changes

- Enabled `no-required-schema-properties-undefined`, `no-schema-type-mismatch`, and `no-enum-type-mismatch` rules for **AsyncAPI** and **Arazzo** specifications.
  Adjusted the rules' severities in the `recommended` and `minimal` rulesets. Refer to the following table:

  | Rule \ Ruleset                          | recommended       | minimal         |
  | --------------------------------------- | ----------------- | --------------- |
  | no-required-schema-properties-undefined | `off` -> `warn`   | `off` -> `warn` |
  | no-enum-type-mismatch                   | `error`           | `warn`          |
  | no-schema-type-mismatch                 | `warn` -> `error` | `off` -> `warn` |

### Patch Changes

- Fixed plugins validation in config files referenced in the `extends` section.
- Fixed an issue where the config resolver grouped assertions instead of returning unchanged rules.

## 2.0.0-next.7

### Patch Changes

- Updated @redocly/config to v0.26.4.

## 2.0.0-next.6

### Patch Changes

- Improved performance of configuration parsing.

## 2.0.0-next.5

### Major Changes

- Removed the deprecated `path-excludes-patterns` and `info-license-url` rules.

## 2.0.0-next.4

### Minor Changes

- Added validation for JSON Schema format.

## 2.0.0-next.3

### Minor Changes

- Configured the `spec` ruleset for OpenAPI, AsyncAPI, Arazzo, and Overlay specifications.
  This ruleset is designed to strictly follow the specifications.

## 2.0.0-next.2

### Patch Changes

- Updated @redocly/config to v0.24.3.

## 2.0.0-next.1

### Minor Changes

- Extracted `nullable` validation from the `struct` rule into a new `nullable-type-sibling` rule for OpenAPI 3.0. This allows users to disable `nullable` validation separately from other structural checks.
- Added the `no-duplicated-tag-names` rule to check for duplications in the `tags` field in API descriptions.

## 2.0.0-next.0

### Major Changes

- Removed backward compatibility for the `spec` rule. Use `struct` instead.
- Removed support for the deprecated `apiDefinitions` option in the Redocly config. Use `apis` instead.
  Removed the `labels` field within the `apis` section, which was associated with the legacy Redocly API Registry product.
- Removed support for the deprecated `features.openapi` and `features.mockServer` configuration options. Use `openapi` and `mockServer` directly instead.
- Removed backward compatibility for the deprecated `lint` and `styleguide` options in the Redocly config.
  Use `rules`, `decorators` and other related options on the root level instead.
- Removed the deprecated `disallowAdditionalProperties` option support in rules. Use `allowAdditionalProperties` instead.
- Removed the deprecated `undefined` assertion. Use `defined` instead.
- Removed support for the legacy Redocly API Registry in favor of the new Reunite platform.
  Reunite provides improved API management capabilities and better integration with Redocly's tooling ecosystem.
  Migrated the `login` and `push` commands to work exclusively with Reunite.
  Removed the `preview-docs` command as part of platform modernization.
  Use the `preview` command instead.
- Removed support for the deprecated `referenceDocs` option, which was related to the legacy Reference docs product.
- Added support for `extends` bundling and array-based plugin configuration.
  Fixed the extends order in the configuration.
- Removed support for the deprecated `assert/` prefix in configurable rules. Use `rule/` prefix instead.
- Migrated the codebase to ES Modules from CommonJS, bringing improved code organization and better support for modern JavaScript features.
  Update to Node.js version 20.19.0+, 22.12.0+, or 23+.
- Streamlined Redocly configuration interfaces for improved developer experience.
  Removed `StyleguideConfig` class in favor of the unified `Config` class.
  Removed `getMergedConfig` function - use `Config.forAlias()` method instead to retrieve API-specific configurations.

### Minor Changes

- Added `x-security` extension for Respect that enables secure handling of authentication in Arazzo workflows.
  Use this extension to:

  - Define security schemes at the step level using either predefined schemes or inline definitions
  - Pass values of secrets (passwords, tokens, API keys)
  - Support multiple authentication types including API Key (query, header, or cookie), Basic Authentication, Bearer Token, Digest Authentication, OAuth2, and OpenID Connect
  - Automatically transform security parameters into appropriate HTTP headers or query parameters

### Patch Changes

- Fixed an issue where the `ignoreLastPathSegment` option of the `path-segment-plural` rule had no effect if the path contained only one segment, resulting in an error.
- Updated @redocly/config to v0.24.1.
- Fixed Redocly CLI to correctly read `residency` from the Redocly configuration file.
- Fixed incorrect validation logic for the `constructor` property.

## 1.34.2

### Patch Changes

- Enhanced performance by pre-calculating the config type tree.

## 1.34.1

## 1.34.0

## 1.33.1

## 1.33.0

## 1.32.2

### Patch Changes

- Updated @redocly/config to v0.22.0.
- Fixed the `no-invalid-schema-examples` rule that incorrectly validated nullable OpenAPI 3.0 schemas.

## 1.32.1

### Patch Changes

- Fixed the `x-example` property in Swagger 2.0 to accept any data type, rather than requiring it to be an object.

## 1.32.0

### Minor Changes

- Added support for linting, preprocessors, decorators, and type extensions for Overlay v1 documents.

### Patch Changes

- Updated OAS3 Schema type definition to correct `type` keyword enum, removed `null`.

## 1.31.3

### Patch Changes

- Changed validation to ensure both (1.0.0 or 1.0.1) Arazzo version works with Respect.

## 1.31.2

### Patch Changes

- Updated @redocly/config to v0.21.0.

## 1.31.1

## 1.31.0

## 1.30.0

### Patch Changes

- Updated `operation-tag-defined` built-in rule to verify tags are defined on the operation prior to matching them to a global tag.

## 1.29.0

### Minor Changes

- Added the `no-schema-type-mismatch` rule.
- Added typings and interfaces for Overlay Specification v1.0.0.

### Patch Changes

- Added validation to ensure only Arazzo version 1.0.1 is used, helping users stay on the supported version.
- Fixed an issue where the `no-invalid-media-type-examples` rule crashed instead of reporting an error when it failed to resolve an example from a $ref.

## 1.28.5

## 1.28.4

## 1.28.3

### Patch Changes

- Added support for the `query` HTTP method in Arazzo operation definitions to enhance API interaction capabilities.

## 1.28.2

### Patch Changes

- Added support for Arazzo version 1.0.1 in Respect validation rules.

## 1.28.1

### Patch Changes

- Resolved an issue where overrides for the severity of configurable rules raised warnings when validating the config.

## 1.28.0

### Minor Changes

- Switched to using native `fetch` API instead of `node-fetch` dependency, improving performance and reducing bundle size.

### Patch Changes

- Removed support for `in: body` parameters due to Arazzo specification updates.
- Updated typings for OAS 3.0 and OAS 3.1 Schemas.

## 1.27.2

### Patch Changes

- Updated the `sideNavStyle` configuration schema to include the `path-only` option.
- Updated @redocly/config to v0.20.1.

## 1.27.1

### Patch Changes

- Fixed an issue where running the `preview` command failed because one of its dependencies could not be resolved.
  The issue occurred when Realm was not installed in the `node_modules` of the project.

## 1.27.0

### Minor Changes

- Added the ability to override default problem messages for built-in rules.

### Patch Changes

- Updated Respect validation rules.

## 1.26.1

### Patch Changes

- Removed the `no-actions-type-end` Respect rule.
- Removed unused lodash.isequal dependency.

## 1.26.0

### Minor Changes

- Introduced the `struct` rule and deprecated the `spec` rule.
  Added the `spec` ruleset, which enforces compliance with the specifications.

### Patch Changes

- Updated `sourceDescriptions` to enforce a valid type field, ensuring compliance with the Arazzo specification.

## 1.25.15

### Patch Changes

- Removed the support of the `x-expect` extension for Arazzo.
- Updated @redocly/config to v0.17.0.

## 1.25.14

### Patch Changes

- Resolved an issue where overrides for the severity of configurable rules were ignored.

## 1.25.13

### Patch Changes

- Added the possibility to skip configurable rules using the `--skip-rule` option.

## 1.25.12

### Patch Changes

- Fixed an issue where valid Redocly tokens were not recognized.

## 1.25.11

### Patch Changes

- Fixed an issue with the `remove-x-internal` decorator where bundling API descriptions containing discriminators could fail when using **Node.js** v17 or earlier.
- Fixed API descriptions bundling. Previously, schemas containing nulls in examples were causing failures.

## 1.25.10

### Patch Changes

- Fixed `component-name-unique` problems to include correct location.
- Fixed the `remove-x-internal` decorator, which was not removing the reference in the corresponding discriminator mapping while removing the original `$ref`.
- Updated @redocly/config to v0.16.0.

## 1.25.9

### Patch Changes

- Updated @redocly/config to v0.15.0.

## 1.25.8

### Patch Changes

- Fixed bundling with the `--dereferenced` option. Previously, references to external files were not substituted with references to components, causing them to become invalid.
- Fixed an issue where using `externalValue` as a property name was causing the API description validation process to fail.

## 1.25.7

### Patch Changes

- Removed the support of the `x-inherit` extension for Arazzo description files.

## 1.25.6

### Patch Changes

- Changed the `x-operation` extension in Arazzo, enabling users to make requests with this extension without an API description file.
- Removed support of the `x-assert` extension for Arazzo.
- Removed the support of the `x-parameters` extension for Arazzo description files.

## 1.25.5

### Patch Changes

- Fixed an issue where the bundle command did not resolve links in `externalValue`.
- Fixed an issue where the plugins in external NPM packages could not be resolved if the CLI package was installed globally.

## 1.25.4

### Patch Changes

- Updated @redocly/config to v0.12.1.

## 1.25.3

### Patch Changes

- Updated @redocly/config to v0.11.0.

## 1.25.2

### Patch Changes

- Fixed `camelCase` assertion for single-letter values.

## 1.25.1

### Patch Changes

- Added additional checks to `criteria-unique` Arazzo rule.

## 1.25.0

### Minor Changes

- Added a mechanism that resolves plugin properties specific to the Reunite-hosted product family.
- Added a cache for resolved plugins to ensure that plugins are only instantiated once during a single execution.

## 1.24.0

### Minor Changes

- Added Respect and Arazzo rules: `no-criteria-xpath`, `no-actions-type-end`, `criteria-unique`.

### Patch Changes

- Updated @redocly/ajv to v8.11.2.
- Fixed an issue where custom rules were not applied to Arazzo descriptions.

## 1.23.1

## 1.23.0

## 1.22.1

### Patch Changes

- Fixed an issue where resolving config in the browser always threw an error.

## 1.22.0

### Minor Changes

- Updated the Arazzo validation types for workflows input, parameter objects, and criteria to match the specification.
- Added Arazzo rulesets so that users can customize their linting rules for this format.

### Patch Changes

- Updated @redocly/config to v0.10.1.

## 1.21.1

### Patch Changes

- Updated @redocly/config to v0.10.0.

## 1.21.0

## 1.20.1

## 1.20.0

### Minor Changes

- Added support for ESM plugins and importing of plugins directly from npm package: `@vendor/package/plugin.js` instead of `./node_modules/@vendor/package/plugin.js`.
- Added `info-license-strict` rule as a replacement of the `info-license-url` to support the OpenAPI 3.1 changes to allow identifier or URL license details.
- Changed plugins format to export a function instead of an object for compatibility with other Redocly products. The backwards compatibility with an old format of plugins is maintained.

### Patch Changes

- Updated @redocly/config to v0.9.0.

## 1.19.0

### Minor Changes

- Added support for AsyncAPI 3.0 description linting.

### Patch Changes

- Fixed an issue where `patternProperties` incorrectly caused linting errors due to a missing `PatternProperties` node.

## 1.18.1

### Patch Changes

- Allowed the `theme.openapi` configuration option to accept settings specific to Redoc 2.x and earlier.
- Fixed an issue in the OpenAPI `spec` rule where `dependentSchemas` was parsed as an array.
  It is now correctly parsed as a map.
- Fixed bundling of `$refs` inside `patternProperties`.
- Updated AsyncAPI v2 typings to abide by JSON Schema draft-07 specification.

## 1.18.0

### Minor Changes

- Added support for Arazzo description linting.

### Patch Changes

- Removed `additionalItems` from OAS 3.0.x typings. This keyword is not supported by the specification.

## 1.17.1

### Patch Changes

- Added JSON Schema draft 2019-09+ validation keyword - `dependentRequired`.
- Updated @redocly/config to v0.6.2.

## 1.17.0

### Minor Changes

- Changed resolution process to include extendedTypes and plugins before linting.

### Patch Changes

- Added support for the `contentSchema` keyword to parse as a schema instance.

## 1.16.0

### Minor Changes

- Users can run the CLI tool behind a proxy by using `HTTP_PROXY` or `HTTPS_PROXY` environment variables to configure the proxy settings.

## 1.15.0

### Minor Changes

- Made `redocly.yaml` validation consistent with the general Redocly config.

### Patch Changes

- Fixed `no-invalid-media-type-examples`, `no-invalid-parameter-examples`, and `no-invalid-schema-examples` rules which allowed falsy example values to pass for any schema.

## 1.14.0

### Minor Changes

- Added the ability to exclude some operations or entire paths from the `security-defined` rule.

## 1.13.0

### Minor Changes

- Added support for the linting command to output markdown format.

## 1.12.2

### Patch Changes

- Improved the experience when the config file doesn't exist or isn't found.

## 1.12.1

### Patch Changes

- Improved loading of configuration files in environments different from Node.js.

## 1.12.0

### Patch Changes

- Improved caching for external configuration resources.

## 1.11.0

### Minor Changes

- Added support for a `github-actions` output format for the `lint` command to annotate reported problems on files when used in a GitHub Actions workflow.

### Patch Changes

- Fixed [`no-invalid-media-type-examples`](https://redocly.com/docs/cli/rules/no-invalid-media-type-examples/) rule `externalValue` example validation.
- Process remove-unused-components rule transitively; components are now removed if they were previously referenced by a removed component.

## 1.10.6

### Patch Changes

- Added a type tree for the `metadata-schema` rule.

## 1.10.5

### Patch Changes

- Updated license text for date and organization naming accuracy.

## 1.10.4

### Patch Changes

- Added a platform check so `@redocly/openapi-core` can support running inside a worker.
- Allowed additional properties in `theme.openapi` config schema to enable libraries that use `@redocly/openapi-core` for configuration linting to extend this part of the schema.

## 1.10.3

### Patch Changes

- Reverted "Users can run the CLI tool behind a proxy by using HTTP_PROXY or HTTPS_PROXY environment variables to configure the proxy settings" temporary.

## 1.10.2

### Patch Changes

- Users can run the CLI tool behind a proxy by using `HTTP_PROXY` or `HTTPS_PROXY` environment variables to configure the proxy settings.

## 1.10.1

### Patch Changes

- fix: Revert "Users can run the CLI tool behind a proxy by using HTTP_PROXY or HTTPS_PROXY environment variables to configure the proxy settings" temporary.

## 1.10.0

### Minor Changes

- Users can run the CLI tool behind a proxy by using `HTTP_PROXY` or `HTTPS_PROXY` environment variables to configure the proxy settings.

## 1.9.1

### Patch Changes

- Fixed a bug with resolving $refs to file names that contain the hash symbol.

## 1.9.0

### Minor Changes

- Added new `no-required-schema-properties-undefined` rule to check if each required schema property is defined.

### Patch Changes

- Fixed an issue where `$ref`s ending in `#` (instead of `#/`) would break the application.

## 1.8.2

## 1.8.1

## 1.8.0

## 1.7.0

### Patch Changes

- Fix schema type of AsyncAPI operation tags
- Fixed a problem where the linter incorrectly returned an error for valid examples that contain references.

## 1.6.0

### Minor Changes

- Added the ability to use `$ref` in the Redocly config file. This ability allows users to split up big config files and maintain their constituent parts independently.

## 1.5.0

### Minor Changes

- Added new rule `array-parameter-serialization` to require that serialization parameters `style` and `explode` are present on array parameters.

## 1.4.1

### Patch Changes

- OpenAPI 3.1.x defaults to JSON Schema draft 2020-12 and the value of property names defined in `properties` was updated since OpenAPI 3.0.x and JSON Schema draft-04.

  In the new JSON Schema specification, each property value within a `properties` schema accepts a `boolean` or `object` schema.

  https://json-schema.org/draft/2020-12/json-schema-core#section-10.3.2.1

- Fixed incorrect browser detection by removing check for 'self' as Bun also exposes it by default.

## 1.4.0

### Minor Changes

- Added `recommended-strict` ruleset which uses the same rules as `recommended` but with the severity level set to `error` for all rules.

## 1.3.0

### Minor Changes

- Added the possibility to configure the linting severity level of the configuration file for all CLI commands.
  Redocly CLI will exit with an error if there are any issues with the configuration file, and the severity is set to `error`.

## 1.2.1

### Patch Changes

- Fixed an issue with nested refs in the `join` command.
- Fixed pattern for no-server-example.com rule to improve detection accuracy.
- Changed the report location for `pattern` and `notPattern` assertions to be more precise.
- Updated `unevaluatedItems` type definition to resolve either boolean or object schema per JSON Schema 2019-09 specification.
- Enhanced public API by small typescript typing fix and exporting new function `bundleFromString`.

## 1.2.0

### Minor Changes

- Added support for linting AsyncAPI v2 files, so that a wider range of API descriptions can use the Redocly linting workflow.

### Patch Changes

- Renamed API definition to API description for consistency.

## 1.1.0

### Minor Changes

- Added `ignoreCase` option for `tags-alphabetical` rule.

### Patch Changes

- Fixed an issue where the `--remove-unused-components` option removed used components that were referenced as child objects.
- Updated Redocly config validation.
- Fixed the location pointer when reporting on the `no-path-trailing-slash` rule.

## 1.0.2

## 1.0.1

### Patch Changes

- Fixed empty custom rules having severity in default rulesets.
