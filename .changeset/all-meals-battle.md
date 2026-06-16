---
'@redocly/cli': minor
---

Improved CLI install speed by bundling the CLI into a dependency-free package.

**Warning:** The published package no longer ships runtime dependencies in `node_modules`.
Plugins that relied on importing packages hoisted from the CLI (such as `@redocly/openapi-core`) must now declare those packages as their own dependencies.
