---
"@redocly/respect-core": minor
"@redocly/cli": minor
---

Added support for generating workflows from OpenAPI operations without operationIds. The `generate-arazzo` command now automatically generates operationPaths using the URL pattern `{$sourceDescriptions.<name>.url}#/paths/<path>/<method>`.
