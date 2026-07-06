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
Each emitter is deep — one narrow entry point over hidden node-building bulk — and owns a single concern: `types.ts` (`typesStatements`/`schemaToTypeNode`), `type-guards.ts` (`typeGuardStatements`), `descriptor.ts` (the `OPERATIONS` descriptor map + the `Ops` type), `operation-aliases.ts`/`operation-types.ts` (the `<Op>*` aliases and their type builders), `sse.ts` (the **SSE** detection seam: `isSseOp`/`partitionOps`/`sseEventType`/`sseDataKind`), and `inline-runtime.ts` (the **inline assembler**).
The foundation module `ts.ts` owns the shared printer and ergonomics: `printNodes` (nodes → source), `parseStatements` (parse hand-authored source into nodes), and `jsdoc` (attach a block comment).
`package-client.ts` is the shared _wiring_ emitter: it assembles each file's content — identical for both runtimes except the runtime block (import vs embed) — and prints **once**, exposing `emitClientSingleFile` / `emitClientSplit`.
Low-level text helpers (`pascalCase`, `splitLines`, `joinSections`) stay private in `support.ts`, and the JSDoc-body builder in `jsdoc.ts` — consumed only by the deep emitters, never by writers.
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
Custom generators are authored with `defineGenerator` and selected inline or by import specifier (the experimental **plugin** API, ADR-0012).
_Avoid_: middleware (that's a runtime concept).

**Schema module** (`zod` generator):
The `<stem>.zod.ts` file the `zod` generator emits — `import { z } from 'zod'` plus one `export const <Name>Schema = z.object(…)` per IR named schema.
Output-mode-agnostic in phase 1 (one module regardless of how the sdk partitions its files); refs become `z.lazy(() => …)`.
Only the metadata refinements stable across zod `3.23 || 4` are emitted (`.min`/`.max`/`.int`/`.gt`/`.lt`/`.regex`); format methods (`.email`/`.uuid`/`.url`) are skipped.
The generated **sdk** client never imports zod — `zod` is the _consumer's_ peer (`^3.23 || ^4`), installed only when validating (`PetSchema.parse(data)`) or deriving types (`z.infer<typeof PetSchema>`).
_Avoid_: validation runtime, zod runtime (the sdk has no zod dependency).

**Runtime**:
The zero-dependency client engine — real TypeScript modules under `src/runtime/` (`send`, `url`, `parse`, `retry`, `errors`, `multipart`, `auth`, `setup`, `sse`, `create-client`), not emitter-built code.
Uses only web-standard APIs.
`createClient(operations, config)` builds a typed **instance client** over the operation descriptors: one bound method per operation plus the core members `configure` / `use` / `auth`; optional behaviors (multipart serialization, auth injection, SSE streaming) are dispatched through the **capability seam** (`Capabilities`, `runtime/create-client.ts`) and never statically imported by the core.
Package mode imports the barrel (`runtime/index.ts`, all capabilities wired); inline mode embeds the same sources — snapshotted into the generated `emitters/runtime-sources.ts` and assembled per the API's needs by `emitters/inline-runtime.ts`, which appends a local `createClient` factory wiring only the needed capabilities.
`parse` decodes a success body into the requested kind — `json` / `text` / `blob` / `arrayBuffer` / `formData` / `stream` (raw `ReadableStream` via `response.body`) / `auto` (content-type sniff, the default); the per-call `RequestOptions` (the trailing `init` arg) carries `parseAs?: ParseAs` — a runtime escape hatch that overrides the inferred decode kind (static return type unchanged) — alongside the `retry` override.
**Error mode** lives in the instance config (fixed at generate time; `configure()` ignores attempts to flip it): throw mode throws `ApiError` on non-2xx, result mode returns the discriminated `Result<TData, TError>`.
For **SSE** operations `runtime/sse.ts` provides `sse<T>` — an `async function*` that parses `text/event-stream` frames into `ServerSentEvent<T>` (`{ event?, data, id?, retry? }`) and auto-reconnects (resuming with `Last-Event-ID`; backoff = server `retry:` → `reconnectDelay` → 1000ms, exponential + jitter, 30s cap).
`SseOptions` (`RequestInit & { reconnect?; reconnectDelay? }`) is the per-call init; aborting via `AbortSignal` or `break`ing the loop completes the iterator cleanly (no throw).
The `sse` capability (and module, in inline mode) is **gated** — wired only when a model declares a streaming op.
_Avoid_: helpers, lib, sdk-core.

**SSE**:
An operation whose 2xx response declares `text/event-stream` is an **SSE** operation.
It is detection-driven — no flag — and marked `responseKind: 'sse'` on its descriptor: the client exposes it as a typed async-generator method (plus the matching free function) returning `AsyncGenerator<ServerSentEvent<T>>`, where `T` comes from the response **`itemSchema`** → media `schema` → `string`.
SSE ops are error-mode-agnostic (they always throw on an initial non-2xx; never return the `Result` shape).
_Avoid_: sse namespace (removed), stream namespace, events client, subscribe.

**Descriptor** / **Wiring** / **Sugar**:
The **descriptor** (`OperationDescriptor`) is the frozen data contract between generated code and the runtime — one operation's wire shape (`id`, `method`, `path`, `params`, `body`, `responseKind`, `security`), emitted into the `OPERATIONS` map (`as const satisfies Record<string, OperationDescriptor>`, which doubles as the version-skew guard in package mode).
The **wiring** is the generated glue around it: schema types, `<Op>*` aliases, the `Ops` type, `OPERATIONS`, and the `export const client = createClient<Ops>(OPERATIONS, …)` instance — identical across both runtimes.
The **sugar** is the derived conveniences bound to that instance: `export const { configure, use } = client`, the free-function operations (arrow consts in `flat` style, a destructure in `grouped`), and the auth setters (`export const setBearer = client.auth.bearer`).
_Avoid_: fragments, ClientModules, barrel, endpoints (pre-runtime-module vocabulary).

**Entry file** / **Schemas module**:
The **entry file** is the `--output` file — the whole client in `single` mode; in `split` mode the **schemas module** (`<stem>.schemas.ts`: schema types, enums, const-objects, type guards) is carved out and the entry `export *`s it.
_Avoid_: index, barrel.

### Knobs

**Output mode**:
The file layout: `single` (one file) or `split` (the schemas module in a sibling `<stem>.schemas.ts` the entry re-exports).
Selected by `--output-mode`; works with both **runtime** distributions.
_Avoid_: format, layout (in prose), split (as a synonym for the whole concept), tags / tags-split (removed modes).

**Runtime distribution** (`runtime` knob):
Where the client engine lives: `inline` (default — the runtime sources embedded in the generated output, zero dependencies) or `package` (the generated file imports it from `@redocly/client-generator`, so engine fixes arrive via `npm update`).
Selected by `--runtime`; the generated wiring and the app-facing surface are identical in both.
_Avoid_: facade (removed knob — every client exports both the instance and the free functions), embedded mode (say inline).

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
The operation **descriptor** carries the hints the same way (only when the param deviates from the defaults); the runtime resolves them per request (`queryStyles`) and `buildUrl` (`runtime/url.ts`) serializes.
`buildUrl` honors `form`+`explode:false` (`key=a,b`), `spaceDelimited` (`key=a%20b`), `pipeDelimited` (`key=a|b`) — literal delimiters, values encoded — and `deepObject` (the bracket form); `allowReserved` skips percent-encoding of RFC-3986 reserved chars (via `encodeReserved`).
Known deviation: an **object** query param at the default `form` style still serializes as `key[sub]=val` (deepObject brackets), not the spec's `sub=val` spread.

**Injectable security scheme**:
A security scheme the **runtime** can auto-apply from the instance's credentials (`ClientConfig.auth`) — HTTP `bearer`, HTTP `basic`, and `apiKey` in header / query / cookie.
OAuth2 / OpenID Connect normalize to `bearer`.
Only `mutualTLS` is skipped.
The generated setters (`setBearer`, `setBasicAuth`, `setApiKey…`) are instance-bound sugar over `client.auth.*`.
Bearer/apiKey credentials are a **`TokenProvider`** — a string or a (possibly async) function `() => string | Promise<string>`, resolved per request.
`resolveAuth` (`runtime/auth.ts`, the auth **capability**) is **async**, returning `{ headers, query }`; query-auth merges into the URL, cookie-auth folds into a combined `Cookie` header.
_Avoid_: auth (unqualified), credential, global setters (credentials are per instance).

## Flagged ambiguities

**"module"** — two senses, keep them straight:

- _Architecture sense_ (interface + implementation) — used when discussing depth/seams (e.g. the `src/runtime/` modules).
- _Emitted-file sense_ — the entry file and (in `split` mode) the schemas module a client is split into.

**`params` vs `Variables` vs `args style`** — easy to conflate:

- `params` = the query object only.
- `Variables` = the _whole_ combined-inputs object (path + params + body + headers).
- `args style` = the _choice_ of how inputs reach the function (positional vs object).

**operation vs endpoint** — `operation` is the IR/spec concept (an `OperationModel`); `endpoints` is the emitted code that realizes operations.

## Example dialogue

> **Dev:** I want the generated calls to take one object instead of positional args.
>
> **Maintainer:** That's the `grouped` **args style**. It bundles each operation's inputs
> into its **Variables** type — so a call becomes `getPet({ id, params })` where `params`
> is still the query object. The `client` instance's methods are always grouped;
> **args style** only shapes the free-function **sugar**.
>
> **Dev:** Does that change the rest of the file?
>
> **Maintainer:** No. The **descriptors**, the **wiring**, and the embedded **runtime**
> are byte-identical across args styles — in `flat` the sugar is per-operation arrow
> consts, in `grouped` it's a destructure from the instance. The **writer** just lays
> the same emitted content out per the **output mode**.
