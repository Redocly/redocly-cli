---
'@redocly/client-generator': minor
'@redocly/openapi-core': minor
'@redocly/cli': minor
---

Added an **experimental** `generate-client` command that generates a typed TypeScript client from an OpenAPI description — auth, retries, middleware, typed SSE streaming, and multipart out of the box, built on a hand-written, directly-tested runtime.

Generated clients are typed operation descriptors (`OPERATIONS … satisfies Record<string, OperationDescriptor>`) plus an `Ops` type, wired into a `createClient` instance. Every generated module exports both call styles: the `client` instance (grouped-args methods plus `configure`/`use`/`auth`) and free-function one-liners (`--args-style` shapes them), and re-exports `createClient` for additional per-tenant instances.

- `--runtime` option (`redocly.yaml`: `client.runtime`): `inline` (default) emits one self-contained, zero-dependency file, embedding only the runtime parts the API needs; `package` makes the generated file import the engine from `@redocly/client-generator`, so runtime fixes arrive via `npm update` with no regeneration. Application code is identical in both modes, and the emitted `satisfies` clause doubles as a build-time version-skew guard.
- `--output-mode`: `single` (default) or `split` (the entry file plus a `<name>.schemas.ts` sibling). Both modes work with both runtimes.
- Middleware sees the operation's identity as literal unions — `ctx.operation.{id,path,tags}` (`OperationId`/`OperationPath`/`OperationTag`, all exported) — so targeting requests by operationId/tags gets autocomplete and compile-time typo-checking.
- Auth follows the spec's `securitySchemes` with per-instance credentials (`client.auth.{bearer,basic,apiKey}` / `ClientConfig.auth`) and generated `setBearer`/`setBasicAuth`/`setApiKey*` sugar bound to the default instance.
- A `--setup` flag bakes a publisher-authored `defineClientSetup({ config, middleware })` module into the generated client (both runtimes and output modes), so a published SDK ships its request/response defaults built in — layered between the spec's defaults and the app's `configure()`. The package exports the runtime contract types + `defineClientSetup` from its main entry.
- Companion generators from the same spec via `--generators`: `zod`, `tanstack-query` (React/Vue/Svelte/Solid), `swr`, `transformers`, `mock` (MSW, baked or faker), plus an experimental `defineGenerator` plugin API — each emits its own file and adds no dependency to the client.
