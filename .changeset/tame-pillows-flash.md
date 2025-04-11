---
"@redocly/respect-core": major
"@redocly/openapi-core": major
"@redocly/cli": major
---

Removed support for the legacy Redocly API registry in favor of our new Reunite platform, providing improved API management capabilities and better integration with our tooling ecosystem. Migrated the `login` and `push` commands to work exclusively with Reunite. Removed the `preview-docs` command as part of our platform modernization. Users should now use the `preview` command instead.
