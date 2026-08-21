---
'@redocly/openapi-core': patch
'@redocly/cli': patch
---

Make the `operation-4xx-response` rule configurable to exclude safe HTTP
methods by default (get, head, options). This allows projects to avoid
requiring 4XX responses for read-only operations while keeping the default
behavior conservative.
