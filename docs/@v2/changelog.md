---
toc:
  maxDepth: 2
---

# Redocly CLI changelog

<!-- do-not-remove -->

## 2.0.0-next.0 (2025-05-07)

### Major Changes

- Removed support for the legacy Redocly API registry in favor of the new Reunite platform.
  Reunite provides improved API management capabilities and better integration with Redocly's tooling ecosystem.
  Migrated the `login` and `push` commands to work exclusively with Reunite.
  Removed the `preview-docs` command as part of platform modernization.
  Use the `preview` command instead.
- Migrated the codebase to ES Modules from CommonJS, bringing improved code organization and better support for modern JavaScript features.
  Update to Node.js version 20.19.0+, 22.12.0+, or 23+.

### Patch Changes

- Updated Redoc to v2.5.0.
- Improved Respect's error handling when server URLs are missing from both OpenAPI descriptions and CLI options. Now provides a clearer error message when no server URL is available.
- Updated @redocly/respect-core to v2.0.0-next.0.
