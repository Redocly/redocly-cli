---
'@redocly/client-generator': minor
'@redocly/cli': minor
---

Added an **experimental** `generate-client` command that generates a typed, zero-dependency TypeScript client from an OpenAPI description.

The generated client exposes the operation's identity (`ctx.operation.{id,path,tags}`) on `RequestContext` so middleware can target requests by operationId/tags. A new `customization` example shows the request/response extension points.

A `--setup` flag bakes a publisher-authored `defineClientSetup({ config, middleware })` module into the generated client (all output modes, both facades), so a published SDK ships its request/response defaults built in. The package now exports the runtime contract types + `defineClientSetup` from its main entry.

`ctx.operation.{id,path,tags}` and the `OPERATIONS` map are now typed as literal unions (`OperationId`/`OperationPath`/`OperationTag`, all exported), so middleware gets autocomplete and compile-time typo-checking; `OPERATIONS` entries now include `tags`.
