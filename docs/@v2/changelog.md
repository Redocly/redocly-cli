---
toc:
  maxDepth: 2
---

# Redocly CLI changelog

<!-- do-not-remove -->

## 2.0.0-next.0 (2025-06-21)

### Major Changes

- Removed backward compatibility for the `spec` rule. Use `struct` instead.
- Removed support for the deprecated `apiDefinitions` option in the Redocly config. Use `apis` instead.
  Also removed the `labels` field within the `apis` section, which was associated with the legacy Redocly Registry product.
- Removed support for the deprecated `features.openapi` and `features.mockServer` configuration options. Please use `openapi` and `mockServer` directly instead.
- Removed backward compatibility for the deprecated `lint` and `styleguide` options in the Redocly config.
  Use `rules`, `decorators` and other related options on the root level instead.
- Removed the deprecated `disallowAdditionalProperties` option support in rules. Use `allowAdditionalProperties` instead.
- Removed the deprecated `undefined` assertion. Use `defined` instead.
- Removed support for the legacy Redocly API registry in favor of the new Reunite platform.
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
  This extension allows you to:

  - Define security schemes at the step level using either predefined schemes or inline definitions
  - Pass secrets values (passwords, tokens, API keys)
  - Support multiple authentication types including API Key (query, header, or cookie), Basic Authentication, Bearer Token, Digest Authentication, OAuth2, and OpenID Connect
  - Automatically transform security parameters into appropriate HTTP headers or query parameters

### Patch Changes

- Updated Redoc to v2.5.0.
- Fixed alias detection when using `--config` from a different folder than the current working directory.
- Improved Respect's error handling when server URLs are missing from both OpenAPI descriptions and CLI options. Now provides a clearer error message when no server URL is available.
- Updated @redocly/respect-core to v2.0.0-next.0.
