---
"@redocly/respect-core": major
"@redocly/openapi-core": major
"@redocly/cli": major
---

Removed support for the legacy Redocly API registry in favor of the new Reunite platform.
Reunite provides improved API management capabilities and better integration with Redocly's tooling ecosystem.
Migrated the `login` and `push` commands to work exclusively with Reunite.
Removed the `preview-docs` command as part of platform modernization.
Use the `preview` command instead.
