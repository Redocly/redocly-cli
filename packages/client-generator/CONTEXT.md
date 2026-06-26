# Client Generator — Context

The domain language of `@redocly/client-generator`: the package that turns an OpenAPI description into a typed, zero-dependency TypeScript client.
Use these terms exactly — in code, comments, commits, and reviews — so the vocabulary stays consistent.
For _how the pieces fit together_, see [ARCHITECTURE.md](./ARCHITECTURE.md).

## Language

### The model

**IR** (Intermediate Representation):
The spec-agnostic model the generator works against, produced from an OpenAPI document by `buildApiModel`.
Everything downstream reads the IR, never the raw OpenAPI.
The root node is the **ApiModel**.
Inputs are accepted as OpenAPI 3.0/3.1/3.2 directly; **Swagger 2.0** is converted to the 3.x shape by `normalizeSwagger2` before `buildApiModel`, so the builder stays 3.x-only.
_Avoid_: AST, schema graph, DOM.

**ApiModel**:
The root of the IR — title, version, base URL, services, schemas, security schemes.
Has many **ServiceModel**s; each has many **OperationModel**s.
_Avoid_: spec, document (those are the raw OpenAPI input).

**SchemaModel**:
A normalized type node in the IR — one of a fixed set of kinds (scalar, object, array, record, ref, literal, enum, union, intersection, null, unknown).
The emitter turns it into a TypeScript type.
_Avoid_: type, schema (unqualified "schema" means the raw OpenAPI schema, not this).

**OperationModel**:
One API operation in the IR — method, path, parameters (split into path/query/header), request body, success responses, **error responses** (`errorResponses`: the declared 4xx/5xx bodies, plus `default` when a 2xx success also exists — consumed only by `errorMode: 'result'` to type the result's `error`), security.
Its `name` is the spec's `operationId`, or — when absent — a synthesized `<method><PascalCasePath>` made unique across the document (declared `operationId`s always win).
Distinct from an **endpoint**, which is the _emitted_ function/file.
_Avoid_: route, handler.

**ResponseBodyModel** (`itemSchema`):
A success/error response body in the IR — its `contentType`, the decoded `schema`, and (OpenAPI 3.2 only) an optional `itemSchema`: the per-item type of a streaming media type.
For a `text/event-stream` response, `itemSchema` is the type of each event's `data` payload; the emitter prefers it over the response `schema` when typing **SSE** events.
_Avoid_: streamSchema, eventSchema (in code identifiers — `itemSchema` mirrors the OpenAPI key).

### Emission

**Emitter**:
Builds a TypeScript **AST** (`ts.factory` nodes) from the IR.
Lives in `emitters/`.
Each emitter is deep — one narrow entry point over hidden node-building bulk — and owns a single concern: `types.ts` (`typesStatements`/`schemaToTypeNode`), `type-guards.ts` (`typeGuardStatements`), `auth.ts` (`authStatements`), `operations.ts` (`operationsBlockStatements`/`operationsMetaStatements`), `sse.ts` (the **SSE** detection seam: `isSseOp`/`partitionOps`/`sseEventType`/`sseDataKind`/`sseFragmentName`), and the **runtime** emitter `runtime.ts`.
The foundation module `ts.ts` owns the shared printer and ergonomics: `printNodes` (nodes → source), `parseStatements` (embed hand-authored source as nodes), and `jsdoc` (attach a block comment).
`client.ts` is the _composition_ emitter: it assembles each file's `ts.Statement[]` and prints **once** via `printNodes`, exposing `emitSingleFile` / `emitModules`.
The writer-facing seam (`ClientModules`) stays string-based.
Low-level text helpers (`pascalCase`, `splitLines`, `joinSections`) stay private in `support.ts`, and the JSDoc-body builder in `jsdoc.ts` — consumed only by the deep emitters, never by writers.
Each emitter also keeps a string-returning wrapper (`renderTypes`/`renderAuth`/… → `printNodes(…)`) that the unit tests assert against.
_Avoid_: renderer, codegen.

**Writer**:
Chooses the _file layout_ from the IR and emit options, then fills each file by calling the emitter.
Lives in `writers/`.
One **Writer** per **output mode**, selected by `getWriter`.
A Writer is an implementation detail of the `sdk` **Generator**.
_Avoid_: formatter, builder.

**Generator**:
A deep module that turns the IR into a set of files for one concern, selected by name through `getGenerator(name)` (mirrors the `getWriter(outputMode)` seam).
Lives in `generators/`.
The `sdk` generator is the typed client (it delegates to the output-mode **Writer**).
The `zod` generator emits a standalone `<stem>.zod.ts` **schema module** (one `export const <Name>Schema` per IR named schema) beside the client.
The `tanstack-query` generator emits a TanStack Query v5 (React) module (`<stem>.tanstack.ts`) wrapping the sdk — per query op a `<op>QueryKey`/`<op>Options` (`queryOptions`) factory + query key, per mutation a `<op>Mutation` (`mutationKey`/`mutationFn`) factory (requires the `sdk` generator; the consumer installs `@tanstack/react-query`).
The `transformers` generator emits a standalone `<stem>.transformers.ts` of `transform<Name>(data: <Name>): <Name>` functions — one per IR named schema that (recursively) carries a `date-time`/`date` field — that walk the value and rewrite wire ISO strings to `new Date(...)` in place, composing across refs (`transformPet` calls `transformOwner`); pair it with the **dateType** knob (`--date-type Date`) so the parsed value matches the type (it imports only the schema TYPES, so the client stays zero-dep).
`generateClient` runs the configured generators (default `['sdk']`, selected via `--generators sdk,zod`) and merges their files.
First-party only — no public plugin API yet.
_Avoid_: plugin (reserved for a future public API), middleware.

**Schema module** (`zod` generator):
The `<stem>.zod.ts` file the `zod` generator emits — `import { z } from 'zod'` plus one `export const <Name>Schema = z.object(…)` per IR named schema.
Output-mode-agnostic in phase 1 (one module regardless of how the sdk partitions its files); refs become `z.lazy(() => …)`.
Only the metadata refinements stable across zod `3.23 || 4` are emitted (`.min`/`.max`/`.int`/`.gt`/`.lt`/`.regex`); format methods (`.email`/`.uuid`/`.url`) are skipped.
The generated **sdk** client never imports zod — `zod` is the _consumer's_ peer (`^3.23 || ^4`), installed only when validating (`PetSchema.parse(data)`) or deriving types (`z.infer<typeof PetSchema>`).
_Avoid_: validation runtime, zod runtime (the sdk has no zod dependency).

**Runtime**:
The zero-dependency code emitted into every generated client — the `fetch` wrapper, URL/query builder (`__buildUrl`), retry machinery, auth state, and the public setters (`configure`, `setBaseUrl`, `setBearer`, `setBasicAuth`, `setApiKey…`).
Uses only web-standard APIs.
The wrapper is split into a shared core and one of two **terminals** (selected by **error mode**): `__send` runs the payload/header build + retry/fetch loop and returns the raw `Response`; `__parse` decodes a success body into the requested kind — `json` / `text` / `blob` / `arrayBuffer` / `formData` / `stream` (raw `ReadableStream` via `response.body`) / `auto` (content-type sniff, the generated default); `__request` (throw mode) delegates to both and throws `ApiError` on non-2xx, while `__requestResult` (result mode) returns the discriminated `Result<TData, TError>` instead.
The per-call `RequestOptions` (the trailing `init` arg) carries `parseAs?: ParseAs` — a runtime escape hatch that overrides the inferred decode kind (static return type unchanged) — alongside the `retry` override.
For **SSE** operations the runtime also emits `__sse<T>` — an `async function*` that wraps `__send`, parses `text/event-stream` frames into `ServerSentEvent<T>` (`{ event?, data, id?, retry? }`), and auto-reconnects (resuming with `Last-Event-ID`; backoff = server `retry:` → `reconnectDelay` → 1000ms, exponential + jitter, 30s cap).
`SseOptions` (`RequestInit & { reconnect?; reconnectDelay? }`) is the per-call init; aborting via `AbortSignal` or `break`ing the loop completes the iterator cleanly (no throw).
The whole `__sse`/`ServerSentEvent`/`SseOptions` block is **gated** — emitted only when a model declares a streaming op.
_Avoid_: helpers, lib, sdk-core.

**SSE** / the `sse` namespace:
An operation whose 2xx response declares `text/event-stream` is an **SSE** operation.
It is detection-driven — no flag — and is emitted under a separate `sse` surface rather than as a plain endpoint: a typed `async function*` returning `AsyncGenerator<ServerSentEvent<T>>`, where `T` comes from the response **`itemSchema`** → media `schema` → `string`.
The functions facade exposes `export const sse = { streamX, … }`; the service-class facade a bound `readonly sse = { … }`; in multi-file modes each tag/class contributes a `__sse_<Class>` fragment that the **barrel** merges into the public `sse`.
SSE ops are error-mode-agnostic (they always throw on an initial non-2xx; never return the `Result` shape).
_Avoid_: stream namespace, events client, subscribe.

**Fragments** → **ClientModules**:
**Fragments** are the emitter's _internal_ breakdown of a client (header, types, type guards, runtime, auth, operations, …) — never exposed to writers.
**ClientModules** is the writer-facing interface `emitModules` returns: the _content_ of each emitted module (`http`, `schemas`, `operations`) plus the per-file wiring.
Writers consume **ClientModules**, never **Fragments**.
_Avoid_: sections, parts, chunks.

**Endpoints** / **Barrel**:
**Endpoints** is the emitted operation code (the standalone functions or class methods).
The **Barrel** is the entry file that re-exports the public surface from the other emitted files.
_Avoid_: index (for the barrel), routes (for endpoints).

### Knobs

**Output mode**:
The file layout: `single` (one file), `split` (http + schemas + endpoints siblings), `tags` (one endpoints file per OpenAPI tag), `tags-split` (a folder per tag).
Selected by `--output-mode`.
_Avoid_: format, layout (in prose), split (as a synonym for the whole concept).

**Facade**:
The developer-facing operation shape: `functions` (standalone async functions) or `service-class` (operations as class methods).
Selected by `--facade`.
Orthogonal to **output mode** and **args style**.
_Avoid_: style, mode, flavor.

**Args style**:
How an operation's inputs are passed: `flat` (path params then `params`/`body`/`headers` slots) or `grouped` (one **Variables** object).
Selected by `--args-style`.
_Avoid_: param style, calling convention.

**Error mode**:
The client's error-handling shape: `throw` (default — operations throw `ApiError` on non-2xx) or `result` (operations return a discriminated `Result<TData, TError>` = `{ data, error, response }`, with `error` typed from the spec's 4xx/5xx response bodies as the `<Op>Error` union).
Selected by `--error-mode`.
Transport/abort failures still throw in both modes; `onError` is a throw-mode hook.
_Avoid_: throwOnError, errorHandling, result shape (in code identifiers).

**dateType**:
How `format: date-time`/`date` string fields are typed: `string` (default — byte-identical to the ISO wire shape) or `Date`.
Selected by `--date-type`.
Under `Date` the sdk emits `Date` for those scalar `string` schemas; the runtime conversion is opt-in and separate — pair it with the **`transformers` generator** (`--generators sdk,transformers`) so the parsed value matches the type.
`int64` → `bigint` is deferred to a follow-up.
_Avoid_: dateMode, parseDates (in code identifiers).

**Variables** (`<Op>Variables`):
The combined-inputs object type for an operation — path params + `params` + `body` + `headers`.
It is the `vars` argument under `args-style grouped`, and the seam wrappers (React Query / SWR) consume it.
_Avoid_: args, params, inputs (those mean narrower things — see below).

**Params**:
Query parameters, specifically.
In a generated operation, `params` is always the query object; it never means "arguments in general".
_Avoid_: arguments, inputs, query-string (in code identifiers).

**Query serialization style**:
How a query param's value is rendered onto the wire.
The OpenAPI default is `form` + `explode: true` (arrays repeat the key; objects become `key[sub]=val`).
`ParamModel` carries the spec's `style` / `explode` / `allowReserved` **only for query params**, and **only when present** — absence means the default, so the IR stays clean.
The operation emits a per-param `styles` literal as `__buildUrl`'s 4th arg **only for non-default** params (style ≠ `form`, or `explode: false`, or `allowReserved`); default params get no entry, so `__buildUrl` runs its existing path and the output is byte-identical.
`__buildUrl` honors `form`+`explode:false` (`key=a,b`), `spaceDelimited` (`key=a%20b`), `pipeDelimited` (`key=a|b`) — literal delimiters, values encoded — and `deepObject` (the bracket form); `allowReserved` skips percent-encoding of RFC-3986 reserved chars (built via `__encodeReserved`).
Known deviation: an **object** query param at the default `form` style still serializes as `key[sub]=val` (deepObject brackets), not the spec's `sub=val` spread.

**Injectable security scheme**:
A security scheme the **runtime** can auto-apply via a setter — HTTP `bearer` (`setBearer`), HTTP `basic` (`setBasicAuth`), and `apiKey` in header / query / cookie (`setApiKey…`).
OAuth2 / OpenID Connect normalize to `bearer`.
Only `mutualTLS` is skipped.
Bearer/apiKey credentials are a **`TokenProvider`** — a string or a (possibly async) function `() => string | Promise<string>`, resolved per request.
`__auth` is **async**, returning `{ headers, query }`; query-auth merges into the URL, cookie-auth folds into a combined `Cookie` header.
_Avoid_: auth (unqualified), credential.

## Flagged ambiguities

**"module"** — two senses, keep them straight:

- _Architecture sense_ (interface + implementation) — used when discussing depth/seams.
- _Emitted-file sense_ — the `http` / `schemas` / `endpoints` / barrel files a client is split into. `ClientModules` is the writer-facing interface describing these.

**`params` vs `Variables` vs `args style`** — easy to conflate:

- `params` = the query object only.
- `Variables` = the _whole_ combined-inputs object (path + params + body + headers).
- `args style` = the _choice_ of how inputs reach the function (positional vs object).

**operation vs endpoint** — `operation` is the IR/spec concept (an `OperationModel`); `endpoints` is the emitted code that realizes operations.

## Example dialogue

> **Dev:** I want the generated calls to take one object instead of positional args.
>
> **Maintainer:** That's the `object` **args style**. It bundles each operation's inputs
> into its **Variables** type — so a call becomes `getPet({ id, params })` where `params`
> is still the query object. It's orthogonal to the **facade**, so it works the same
> whether you emit standalone functions or a service class.
>
> **Dev:** Does that change the shared files?
>
> **Maintainer:** No. **Args style** only affects the **endpoints**. The **runtime** and
> **schemas** **modules** are byte-identical across args styles and facades — the
> **writer** just lays the same emitted content out across files per the **output mode**.
> Internally the **emitter** builds **fragments**, but the writers only ever see
> **ClientModules**.
