# @redocly/respect-core

## 2.3.1

### Patch Changes

- Fixed an issue where JSONPath-based success criteria did not support property names with hyphens in `Respect`.
- Updated @redocly/openapi-core to v2.3.1.

## 2.3.0

### Patch Changes

- Updated @redocly/openapi-core to v2.3.0.

## 2.2.3

### Patch Changes

- Fixed an issue where the Respect workflow separator did not render correctly in GitHub CI environments.
- Updated @redocly/openapi-core to v2.2.3.

## 2.2.2

### Patch Changes

- Updated @redocly/openapi-core to v2.2.2.

## 2.2.1

### Patch Changes

- Updated @redocly/openapi-core to v2.2.1.

## 2.2.0

### Minor Changes

- Adjusted the calculation of Respect's workflow-level `totalTimeMs` to sum the network request times of all steps.

### Patch Changes

- Updated @redocly/openapi-core to v2.2.0.

## 2.1.5

### Patch Changes

- Improved the message format for Respect's `status code check`.
- Fixed handling of input parameters when invoking step target workflows in Respect.
- Updated @redocly/openapi-core to v2.1.5.

## 2.1.4

### Patch Changes

- Updated @redocly/openapi-core to v2.1.4.

## 2.1.3

### Patch Changes

- Updated @redocly/openapi-core to v2.1.3.

## 2.1.2

### Patch Changes

- Updated @redocly/openapi-core to v2.1.2.

## 2.1.1

### Patch Changes

- Updated @redocly/openapi-core to v2.1.1.

## 2.1.0

### Patch Changes

- Improved error reporting and handling for Digest authentication failures in Respect. Now users receive clearer feedback when required headers or status codes are missing.
- Updated @redocly/openapi-core to v2.1.0.

## 2.0.8

### Patch Changes

- Updated @redocly/openapi-core to v2.0.8.

## 2.0.7

### Patch Changes

- Improved Respect verbose logs to display response headers.
- Updated @redocly/openapi-core to v2.0.7.

## 2.0.6

### Patch Changes

- Updated the `retryAfter` property in Respect to use seconds (instead of milliseconds) for consistency with the Arazzo specification.
- Updated @redocly/openapi-core to v2.0.6.

## 2.0.5

### Patch Changes

- Updated the exported `run` function in `Respect` to utilize the `maxSteps` count logic.
- Updated @redocly/openapi-core to v2.0.5.

## 2.0.4

### Patch Changes

- Ensure `externalRefResolver` option is correctly passed to nested workflow contexts.
- Updated @redocly/openapi-core to v2.0.4.

## 2.0.3

### Patch Changes

- Fixed type definitions for Respect `input` and `server` options to support both string and string[] values.
- Fixed binary response data in `Respect` results by properly encoding it as base64.
- Updated @redocly/openapi-core to v2.0.3.

## 2.0.2

### Patch Changes

- Made `executionTimeout` parameter optional in the `run` function exported from `respect-core`.
- Updated @redocly/openapi-core to v2.0.2.

## 2.0.1

### Patch Changes

- Fixed an issue where multipart form-data parameters were not properly resolved and evaluated before sending requests.
- Updated @redocly/openapi-core to v2.0.1.

## 2.0.0

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

- Implemented automatic masking of sensitive fields (such as tokens and passwords) in response bodies to enhance security and prevent accidental exposure of secrets in logs and outputs.
- Added new CLI options for the `respect` command to improve test execution control.

### Patch Changes

- Refactored `@redocly/respect-core` to eliminate Node.js-specific dependencies, improving cross-platform compatibility.
- Resolved an issue where `dotenv@16.6.0` injected an unintended message into the output.
- Improved Respect's error handling when server URLs are missing from both OpenAPI descriptions and CLI options.
- Updated @redocly/openapi-core to v2.0.0.

## 2.0.0-next.10

### Patch Changes

- Updated @redocly/openapi-core to v2.0.0-next.10.

## 2.0.0-next.9

### Patch Changes

- Refactored `@redocly/respect-core` to eliminate Node.js-specific dependencies, improving cross-platform compatibility.
- Updated @redocly/openapi-core to v2.0.0-next.9.

## 2.0.0-next.8

### Patch Changes

- Updated @redocly/openapi-core to v2.0.0-next.8.

## 2.0.0-next.7

### Patch Changes

- Updated @redocly/openapi-core to v2.0.0-next.7.

## 2.0.0-next.6

### Patch Changes

- Updated @redocly/openapi-core to v2.0.0-next.6.

## 2.0.0-next.5

### Patch Changes

- Updated @redocly/openapi-core to v2.0.0-next.5.

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
