---
'@redocly/client-generator': minor
'@redocly/openapi-core': minor
'@redocly/cli': minor
---

Added an experimental `generate-client` command that generates a typed, zero-dependency TypeScript client from an OpenAPI description — auth, retries, middleware, typed SSE streaming, pagination, and multipart included — plus optional companion generators for Zod validation, TanStack Query and SWR hooks, MSW mocks, and date transformers.
See the [`generate-client` command reference](https://redocly.com/docs/cli/commands/generate-client) and the [Use the generated client](https://redocly.com/docs/cli/guides/use-generated-client) guide.
