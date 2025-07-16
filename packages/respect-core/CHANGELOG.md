# @redocly/respect-core

## 2.0.0-next.4

### Patch Changes

- Updated @redocly/openapi-core to v2.0.0-next.4.

## 2.0.0-next.3

### Patch Changes

- Updated @redocly/openapi-core to v2.0.0-next.3.

## 2.0.0-next.2

### Patch Changes

- Resolved an issue where `dotenv@16.6.0` injected an unintended message into the output.
- Updated @redocly/openapi-core to v2.0.0-next.2.

## 2.0.0-next.1

### Minor Changes

- Implemented automatic masking of sensitive fields (such as tokens and passwords) in response bodies to enhance security and prevent accidental exposure of secrets in logs and outputs.

### Patch Changes

- Updated @redocly/openapi-core to v2.0.0-next.1.

## 2.0.0-next.0

### Major Changes

- Removed support for the legacy Redocly API Registry in favor of the new Reunite platform.
  Reunite provides improved API management capabilities and better integration with Redocly's tooling ecosystem.
  Migrated the `login` and `push` commands to work exclusively with Reunite.
  Removed the `preview-docs` command as part of platform modernization.
  Use the `preview` command instead.
- Migrated the codebase to ES Modules from CommonJS, bringing improved code organization and better support for modern JavaScript features.
  Update to Node.js version 20.19.0+, 22.12.0+, or 23+.

### Minor Changes

- Added `x-security` extension for Respect that enables secure handling of authentication in Arazzo workflows.
  Use this extension to:

  - Define security schemes at the step level using either predefined schemes or inline definitions
  - Pass values of secrets (passwords, tokens, API keys)
  - Support multiple authentication types including API Key (query, header, or cookie), Basic Authentication, Bearer Token, Digest Authentication, OAuth2, and OpenID Connect
  - Automatically transform security parameters into appropriate HTTP headers or query parameters

- Added new CLI options for the `respect` command to improve test execution control.

### Patch Changes

- Improved Respect's error handling when server URLs are missing from both OpenAPI descriptions and CLI options.
- Updated @redocly/openapi-core to v2.0.0-next.0.

## 1.34.2

### Patch Changes

- Updated @redocly/openapi-core to v1.34.2.

## 1.34.1

### Patch Changes

- Improved OpenTelemetry data serialization.
- Updated @redocly/openapi-core to v1.34.1.

## 1.34.0

### Minor Changes

- Added global execution timeout timer to `respect` command execution to prevent infinite test runs. You can configure this timer using the `RESPECT_TIMEOUT` environment variable (defaults to 1 hour).

### Patch Changes

- Updated @redocly/openapi-core to v1.34.0.

## 1.33.1

### Patch Changes

- Fixed `generate-arazzo` command to properly handle output file paths. The `output-file` parameter must have a value when provided.
- Updated @redocly/openapi-core to v1.33.1.

## 1.33.0

### Minor Changes

- Added support for generating workflows from OpenAPI operations without operationIds. The `generate-arazzo` command now automatically generates operationPaths using the URL pattern: `{$sourceDescriptions.<name>.url}#/paths/<path>/<method>`.

### Patch Changes

- Updated @redocly/openapi-core to v1.33.0.

## 1.32.2

### Patch Changes

- Fixed step execution to respect severity levels when handling step failures. Previously, steps would always break workflow execution on failure when onFailure is omitted, but now they properly consider the configured severity level (e.g., `warn` | `off` severity allows subsequent steps to execute).
- Updated @redocly/openapi-core to v1.32.2.

## 1.32.1

### Patch Changes

- Added support for `basic`, `bearer`, and `apiKey` security schemes in workflow generation with `generate-arazzo` command.
- Updated @redocly/openapi-core to v1.32.1.

## 1.32.0

### Patch Changes

- Fixed an issue where JSON logs did not properly capture data from nested external workflows.
- Updated @redocly/openapi-core to v1.32.0.

## 1.31.3

### Patch Changes

- Updated @redocly/openapi-core to v1.31.3.

## 1.31.2

### Patch Changes

- Fixed `sourceDescription` name generation in `generate-arazzo` command when using OpenAPI files that contain multiple periods "." in their filenames.
- Updated @redocly/openapi-core to v1.31.2.

## 1.31.1

### Patch Changes

- Updated @redocly/openapi-core to v1.31.1.

## 1.31.0

### Minor Changes

- Added the `generate-arazzo` command to scaffold Arazzo description templates out of OpenAPI descriptions.
- Added the `respect` command to test APIs against Arazzo description files.

### Patch Changes

- Updated @redocly/openapi-core to v1.31.0.
