---
'@redocly/cli': minor
'@redocly/openapi-core': patch
---

Added an experimental `generate-map` command that writes a compressed plain-text map of an OpenAPI description — one line per operation with its auth, required fields, and source coordinates — for LLM agents to search locally instead of re-reading the description.
