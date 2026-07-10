---
'@redocly/client-generator': minor
'@redocly/openapi-core': minor
'@redocly/cli': minor
---

Added an **experimental** `generate-client` command that generates a typed, zero-dependency TypeScript client from an OpenAPI description — auth, retries, middleware, typed SSE streaming, pagination, and multipart out of the box.

See the [`generate-client` command reference](https://redocly.com/docs/cli/commands/generate-client) and [Use the generated client](https://redocly.com/docs/cli/guides/use-generated-client) for full documentation. Highlights:

- `--runtime` option (`redocly.yaml`: `client.runtime`): `inline` (default) emits one self-contained, zero-dependency file, embedding only the runtime parts the API needs; `package` makes the generated file import the engine from `@redocly/client-generator`, so runtime fixes arrive via `npm update` with no regeneration. Application code is identical in both modes, and the emitted `satisfies` clause doubles as a build-time version-skew guard.
- `--output-mode`: `single` (default) or `split` (the entry file plus a `<name>.schemas.ts` sibling). Both modes work with both runtimes.
- Middleware sees the operation's identity as literal unions — `ctx.operation.{id,path,tags}` (`OperationId`/`OperationPath`/`OperationTag`, all exported) — so targeting requests by operationId/tags gets autocomplete and compile-time typo-checking.
- Auth follows the spec's `securitySchemes` with per-instance credentials (`client.auth.{bearer,basic,apiKey}` / `ClientConfig.auth`) and generated `setBearer`/`setBasicAuth`/`setApiKey*` sugar bound to the default instance.
- Auto-pagination, declared rather than guessed: a `client.pagination` block in `redocly.yaml` (a convention rule + per-operation overrides + `exclude`) or the spec's `x-pagination` operation extension gives paginated operations typed `.pages()`/`.items()` async iterators (`cursor`, `offset`, and `page` styles) next to the unchanged one-shot call, with item types resolved from the response schema at generate time. The convention applies only to operations it structurally fits (verified against declared query params and the success-response schema); an explicit rule that doesn't fit fails generation with a per-operation error. Works in both runtimes — inline output embeds the pagination module only when an operation paginates.
- A `--setup` flag bakes a publisher-authored `defineClientSetup({ config, middleware })` module into the generated client (both runtimes and output modes), so a published SDK ships its request/response defaults built in — layered between the spec's defaults and the app's `configure()`. The package exports the runtime contract types + `defineClientSetup` from its main entry.
- Companion generators from the same spec via `--generators`: `zod`, `tanstack-query` (React/Vue/Svelte/Solid), `swr`, `transformers`, `mock` (MSW, baked or faker), plus an experimental `defineGenerator` plugin API — each emits its own file and adds no dependency to the client.
