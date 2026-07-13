---
'@redocly/client-generator': minor
'@redocly/openapi-core': minor
'@redocly/cli': minor
---

Added an experimental `generate-client` command that generates a typed, zero-dependency TypeScript client from an OpenAPI description — with auth, retries, middleware, typed SSE streaming, auto-pagination, and multipart support.
The `--generator` option emits companion modules from the same description: `zod`, `tanstack-query`, `swr`, `transformers`, and `mock`.
See the [`generate-client` command reference](https://redocly.com/docs/cli/commands/generate-client) and the [Use the generated client](https://redocly.com/docs/cli/guides/use-generated-client) guide.
