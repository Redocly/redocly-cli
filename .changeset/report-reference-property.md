---
"@redocly/openapi-core": minor
---

Added a `reference` property to `context.report()` so that custom rules can link to external documentation.
When set, the URL is rendered beneath the message in both stylish and `github-actions` output formats.
Configurable rules also accept a top-level `reference` field.
