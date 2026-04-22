---
"@redocly/openapi-core": minor
---

Added a `reference` property to `context.report()` so custom rules can link to external documentation. Configurable rules also accept a top-level `reference` field.
When set, the URL is rendered beneath the message in both stylish and `github-actions` output formats.
