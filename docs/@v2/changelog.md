---
toc:
  maxDepth: 2
---

# Redocly CLI changelog

<!-- do-not-remove -->

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
