---
toc:
  maxDepth: 2
---

# Redocly CLI changelog

<!-- do-not-remove -->

## 2.15.2 (2026-02-05)

### Patch Changes

- Fixed an issue where improperly structured OpenAPI examples caused the linter to fail.
- Updated @redocly/openapi-core to v2.15.2.

## 2.15.1 (2026-02-02)

### Patch Changes

- Updated @redocly/openapi-core to v2.15.1.

## 2.15.0 (2026-01-27)

### Patch Changes

- Removed unused `chokidar` dependency.
- Updated @redocly/openapi-core to v2.15.0.

## 2.14.9 (2026-01-23)

### Patch Changes

- Updated @redocly/openapi-core to v2.14.9.

## 2.14.8 (2026-01-23)

### Patch Changes

- Fixed an issue where multi-line lint error messages could break Markdown formatting.
- Updated @redocly/openapi-core to v2.14.8.

## 2.14.7 (2026-01-22)

### Patch Changes

- Updated @redocly/openapi-core to v2.14.7.

## 2.14.6 (2026-01-21)

### Patch Changes

- Updated @redocly/openapi-core to v2.14.6.

## 2.14.5 (2026-01-12)

### Patch Changes

- Added an `ajv` npm alias dependency to satisfy peer dependency requirements and prevent installation warnings.
- Updated @redocly/openapi-core to v2.14.5.

## 2.14.4 (2026-01-08)

### Patch Changes

- Corrected an issue where `Respect` did not properly JSON-encode request bodies for custom content-types containing numbers.
- Updated @redocly/respect-core to v2.14.4.

## 2.14.3 (2026-01-02)

### Patch Changes

- Fixed the `split` command to properly handle root-level paths.
  Previously, the root path `/` was converted to an empty string as a filename, leading to incorrect file structure and broken links.
  Now, it correctly maps to the specified path separator.
- Updated @redocly/openapi-core to v2.14.3.

## 2.14.2 (2025-12-30)

### Patch Changes

- Updated @redocly/openapi-core to v2.14.2.

## 2.14.1 (2025-12-24)

### Patch Changes

- Updated @redocly/openapi-core to v2.14.1.

## 2.14.0 (2025-12-19)

### Patch Changes

- Updated @redocly/respect-core to v2.14.0.

## 2.13.0 (2025-12-17)

### Minor Changes

- Implemented basic support for OpenRPC specification.

### Patch Changes

- Updated @redocly/openapi-core to v2.13.0.

## 2.12.7 (2025-12-15)

### Patch Changes

- Added `scorecard-classic` command to evaluate API descriptions against project scorecard configurations.
- Updated @redocly/openapi-core to v2.12.7.

## 2.12.6 (2025-12-10)

### Patch Changes

- Updated @redocly/openapi-core to v2.12.6.

## 2.12.5 (2025-12-09)

### Patch Changes

- Updated React dependency to avoid vulnerable React version (19.0.0) affected by CVE-2025-55182.
- Updated @redocly/openapi-core to v2.12.5.

## 2.12.4 (2025-12-08)

### Patch Changes

- Fixed a compatibility issue with `HTTP_PROXY` environment variable for the `push` command.
- Updated @redocly/openapi-core to v2.12.4.

## 2.12.3 (2025-12-05)

### Patch Changes

- Updated telemetry implementation to use standardized OpenTelemetry format.
- Updated @redocly/openapi-core to v2.12.3.

## 2.12.2 (2025-12-02)

### Patch Changes

- Fixed an issue where credentials reated by Redocly CLI `login` command were deleted by Redocly VS Code extension when opening VS Code.
- Updated @redocly/openapi-core to v2.12.2.

## 2.12.1 (2025-11-28)

### Patch Changes

- Fixed an issue where multiple `--mtls` options in the Respect command did not merge as expected.
- Updated @redocly/openapi-core to v2.12.1.

## 2.12.0 (2025-11-25)

### Minor Changes

- Added OpenAPI 3.2 XML modeling support.

### Patch Changes

- Fixed an issue where the `no-required-schema-properties-undefined` caused a crash when encountering unresolved `$ref`s.
- Updated @redocly/openapi-core to v2.12.0.

## 2.11.1 (2025-11-10)

### Patch Changes

- Fixed an issue where the content of `$ref`s inside example values was erroneously resolved during bundling and linting.
- Fixed `no-invalid-media-type-examples` for schemas using `anyOf`/`oneOf`.
- Updated @redocly/openapi-core to v2.11.1.

## 2.11.0 (2025-11-04)

### Patch Changes

- Updated @redocly/openapi-core to v2.11.0.

## 2.10.0 (2025-10-31)

### Patch Changes

- Updated @redocly/openapi-core to v2.10.0.

## 2.9.0 (2025-10-30)

### Patch Changes

- Fixed an issue where the `mount-path` option was not validated, leading to errors when used with an empty path or a path identical to the project path.
- Updated @redocly/openapi-core to v2.9.0.

## 2.8.0 (2025-10-23)

### Minor Changes

- Added the `no-invalid-schema-examples` and `no-invalid-parameter-examples` to the `recommended` ruleset.
  Added the `no-duplicated-tag-names` to the `spec` ruleset.
- Added configuration of Respect mTLS certificates on a per-domain basis.

### Patch Changes

- Updated @redocly/openapi-core to v2.8.0.

## 2.7.1 (2025-10-23)

### Patch Changes

- Applied proxy settings during Respect execution.
- Updated @redocly/openapi-core to v2.7.1.

## 2.7.0 (2025-10-17)

### Patch Changes

- Updated @redocly/openapi-core to v2.7.0.

## 2.6.0 (2025-10-16)

### Minor Changes

- Added new rules for validating OpenAPI 3.2 description files: `spec-no-invalid-tag-parents`, `spec-example-values`, `spec-discriminator-defaultMapping`, and `spec-no-invalid-encoding-combinations`.
  Deprecated the `no-example-value-and-externalValue` rule in favor of `spec-example-values`.

### Patch Changes

- Updated @redocly/openapi-core to v2.6.0.

## 2.5.1 (2025-10-13)

### Patch Changes

- Fixed an issue where the `no-http-verbs-in-paths` rule was incorrectly flagging path names containing the verb `query`.
- Updated @redocly/openapi-core to v2.5.1.

## 2.5.0 (2025-10-09)

### Minor Changes

- Added response size to the `Respect` terminal and JSON file outputs.

### Patch Changes

- Updated @redocly/respect-core to v2.5.0.

## 2.4.0 (2025-10-08)

### Minor Changes

- Added the `no-secrets-masking` option to the respect command, allowing raw (unmasked) output to be generated.

### Patch Changes

- Updated @redocly/respect-core to v2.4.0.

## 2.3.1 (2025-10-06)

### Patch Changes

- Fixed an issue where JSONPath-based success criteria did not support property names with hyphens in `Respect`.
- Updated @redocly/openapi-core to v2.3.1.

## 2.3.0 (2025-10-03)

### Minor Changes

- Added basic support for **OpenAPI 3.2** specification.

### Patch Changes

- Updated @redocly/openapi-core to v2.3.0.

## 2.2.3 (2025-10-02)

### Patch Changes

- Fixed an issue where the Respect workflow separator did not render correctly in GitHub CI environments.
- Added support for the `verbose` option in the `login` command to provide additional output during authentication.
- Updated @redocly/respect-core to v2.2.3.

## 2.2.2 (2025-09-26)

### Patch Changes

- Resolved an issue with CLI dependencies to ensure proper package resolution.
- Updated @redocly/openapi-core to v2.2.2.

## 2.2.1 (2025-09-25)

### Patch Changes

- Fixed an issue where the `remove-unused-components` decorator was not functioning when configured at the API level.
- Updated @redocly/openapi-core to v2.2.1.

## 2.2.0 (2025-09-23)

### Minor Changes

- Adjusted the calculation of Respect's workflow-level `totalTimeMs` to sum the network request times of all steps.

### Patch Changes

- Updated @redocly/respect-core to v2.2.0.

## 2.1.5 (2025-09-19)

### Patch Changes

- Improved the message format for Respect's `status code check`.
- Fixed handling of input parameters when invoking step target workflows in Respect.
- Updated @redocly/respect-core to v2.1.5.

## 2.1.4 (2025-09-17)

### Patch Changes

- Fixed undefined variable used in the `remove-unused-components` decorator, which prevented an invalid reference error from being reported.
- Updated @redocly/openapi-core to v2.1.4.

## 2.1.3 (2025-09-15)

### Patch Changes

- Updated authentication logic to get the residency from `scorecard.fromProjectUrl`.
- Updated @redocly/openapi-core to v2.1.3.

## 2.1.2 (2025-09-13)

### Patch Changes

- Updated @redocly/openapi-core to v2.1.2.

## 2.1.1 (2025-09-12)

### Patch Changes

- Updated @redocly/openapi-core to v2.1.1.

## 2.1.0 (2025-09-10)

### Minor Changes

- Updated authentication logic to ensure consistency with the VS Code extension's behavior.

### Patch Changes

- Improved error reporting and handling for Digest authentication failures in Respect. Now users receive clearer feedback when required headers or status codes are missing.
- Fixed `push` and `push-status` commands mistakenly requiring the `--max-execution-time` option.
- Fixed an issue where wildcard file patterns were not recognized in the Docker image.
- Updated @redocly/respect-core to v2.1.0.

## 2.0.8 (2025-08-27)

### Patch Changes

- Updated @redocly/openapi-core to v2.0.8.

## 2.0.7 (2025-08-22)

### Patch Changes

- Improved Respect verbose logs to display response headers.
- Updated @redocly/respect-core to v2.0.7.

## 2.0.6 (2025-08-19)

### Patch Changes

- Fixed an issue where files specified in decorators parameters were not always resolved correctly.
  The resolution logic now properly locates the specified files relative to the config file for `info-description-override`, `media-type-examples-override`, `operation-description-override`, and `tag-description-override` decorators.
- Improved messaging to clarify when API alias configuration is implicitly applied during linting or bundling by filename.
- Updated the `retryAfter` property in Respect to use seconds (instead of milliseconds) for consistency with the Arazzo specification.
- Updated @redocly/openapi-core to v2.0.6.

## 2.0.5 (2025-08-13)

### Patch Changes

- Fixed an issue where the root config was not properly merged with the `apis` config.
- Resolved an issue that caused configuration parsing to fail when the config value was set to `null`.
- Improved join command server handling for specifications with differing servers.
- Updated @redocly/respect-core to v2.0.5.

## 2.0.4 (2025-08-12)

### Patch Changes

- Fixed an issue where the `openapi` config options were ignored when running the `build-docs` command.
- Ensure `externalRefResolver` option is correctly passed to nested workflow contexts.
- Updated @redocly/respect-core to v2.0.4.

## 2.0.3 (2025-08-11)

### Patch Changes

- Fixed type definitions for Respect `input` and `server` options to support both string and string[] values.
- Fixed binary response data in `Respect` results by properly encoding it as base64.
- Updated @redocly/respect-core to v2.0.3.

## 2.0.2 (2025-07-29)

### Patch Changes

- Made `executionTimeout` parameter optional in the `run` function exported from `respect-core`.
- Updated @redocly/respect-core to v2.0.2.

## 2.0.1 (2025-07-25)

### Patch Changes

- Fixed an issue where the `no-required-schema-properties-undefined` rule incorrectly resolved nested `$ref`s relative to the file in which they were defined.
- Fixed an issue where multipart form-data parameters were not properly resolved and evaluated before sending requests.
- Updated @redocly/openapi-core to v2.0.1.

## 2.0.0 (2025-07-24)

### Major Changes

- Removed backward compatibility for the `spec` rule. Use `struct` instead.
- Removed support for the deprecated `apiDefinitions` option in the Redocly config. Use `apis` instead.
  Removed the `labels` field within the `apis` section, which was associated with the legacy Redocly API Registry product.
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
- Removed support for the deprecated `assert/` prefix in configurable rules. Use `rule/` prefix instead.
- Migrated the codebase to ES Modules from CommonJS, bringing improved code organization and better support for modern JavaScript features.
  Update to Node.js version 20.19.0+, 22.12.0+, or 23+.

### Minor Changes

- Added `x-security` extension for Respect that enables secure handling of authentication in Arazzo workflows.
  Use this extension to:

  - Define security schemes at the step level using either predefined schemes or inline definitions
  - Pass values of secrets (passwords, tokens, API keys)
  - Support multiple authentication types including API Key (query, header, or cookie), Basic Authentication, Bearer Token, Digest Authentication, OAuth2, and OpenID Connect
  - Automatically transform security parameters into appropriate HTTP headers or query parameters

- Added environment variable support for CLI arguments using Yargs `.env()` method to parse environment variables with matching prefixes.
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

- Implemented automatic masking of sensitive fields (such as tokens and passwords) in response bodies to enhance security and prevent accidental exposure of secrets in logs and outputs.
- Added new CLI options for the `respect` command to improve test execution control.

### Patch Changes

- Fixed plugins validation in config files referenced in the `extends` section.
- Fixed `no-undefined-server-variable` crash when encountering `null` values in the server list.
- Refactored `@redocly/respect-core` to eliminate Node.js-specific dependencies, improving cross-platform compatibility.
- Updated Redoc to v2.5.0.
- Fixed alias detection when using `--config` from a different folder than the current working directory.
- Resolved an issue where `dotenv@16.6.0` injected an unintended message into the output.
- Fixed Redocly CLI to correctly read `residency` from the Redocly configuration file.
- Improved Respect's error handling when server URLs are missing from both OpenAPI descriptions and CLI options.
- Updated @redocly/respect-core to v2.0.0.

## 2.0.0-next.10 (2025-07-24)

### Major Changes

- Removed support for the deprecated `theme` property of Redocly config.
  All the properties of `theme` are now available in the config root.

### Patch Changes

- Updated @redocly/openapi-core to v2.0.0-next.10.

## 2.0.0-next.9 (2025-07-24)

### Patch Changes

- Refactored `@redocly/respect-core` to eliminate Node.js-specific dependencies, improving cross-platform compatibility.
- Updated @redocly/openapi-core to v2.0.0-next.9.

## 2.0.0-next.8 (2025-07-23)

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
- Updated @redocly/openapi-core to v2.0.0-next.8.

## 2.0.0-next.7 (2025-07-21)

### Patch Changes

- Updated @redocly/openapi-core to v2.0.0-next.7.

## 2.0.0-next.6 (2025-07-21)

### Patch Changes

- Updated @redocly/openapi-core to v2.0.0-next.6.

## 2.0.0-next.5 (2025-07-17)

### Major Changes

- Removed the deprecated `path-excludes-patterns` and `info-license-url` rules.

### Patch Changes

- Updated @redocly/openapi-core to v2.0.0-next.5.

## 2.0.0-next.4 (2025-07-16)

### Minor Changes

- Added validation for JSON Schema format.

### Patch Changes

- Updated @redocly/openapi-core to v2.0.0-next.4.

## 2.0.0-next.3 (2025-07-14)

### Minor Changes

- Configured the `spec` ruleset for OpenAPI, AsyncAPI, Arazzo, and Overlay specifications.
  This ruleset is designed to strictly follow the specifications.

### Patch Changes

- Updated @redocly/openapi-core to v2.0.0-next.3.

## 2.0.0-next.2 (2025-07-10)

### Patch Changes

- Resolved an issue where `dotenv@16.6.0` injected an unintended message into the output.
- Updated @redocly/openapi-core to v2.0.0-next.2.

## 2.0.0-next.1 (2025-07-09)

### Minor Changes

- Extracted `nullable` validation from the `struct` rule into a new `nullable-type-sibling` rule for OpenAPI 3.0. This allows users to disable `nullable` validation separately from other structural checks.
- Added the `no-duplicated-tag-names` rule to check for duplications in the `tags` field in API descriptions.
- Implemented automatic masking of sensitive fields (such as tokens and passwords) in response bodies to enhance security and prevent accidental exposure of secrets in logs and outputs.

### Patch Changes

- Updated @redocly/openapi-core to v2.0.0-next.1.

## 2.0.0-next.0 (2025-07-09)

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
- Removed support for the deprecated `assert/` prefix in configurable rules. Use `rule/` prefix instead.
- Migrated the codebase to ES Modules from CommonJS, bringing improved code organization and better support for modern JavaScript features.
  Update to Node.js version 20.19.0+, 22.12.0+, or 23+.

### Minor Changes

- Added `x-security` extension for Respect that enables secure handling of authentication in Arazzo workflows.
  Use this extension to:

  - Define security schemes at the step level using either predefined schemes or inline definitions
  - Pass values of secrets (passwords, tokens, API keys)
  - Support multiple authentication types including API Key (query, header, or cookie), Basic Authentication, Bearer Token, Digest Authentication, OAuth2, and OpenID Connect
  - Automatically transform security parameters into appropriate HTTP headers or query parameters

- Added environment variable support for CLI arguments using Yargs `.env()` method to parse environment variables with matching prefixes.
- Added new CLI options for the `respect` command to improve test execution control.

### Patch Changes

- Fixed `no-undefined-server-variable` crash when encountering `null` values in the server list.
- Updated Redoc to v2.5.0.
- Fixed alias detection when using `--config` from a different folder than the current working directory.
- Fixed Redocly CLI to correctly read `residency` from the Redocly configuration file.
- Improved Respect's error handling when server URLs are missing from both OpenAPI descriptions and CLI options.
- Updated @redocly/respect-core to v2.0.0-next.0.
