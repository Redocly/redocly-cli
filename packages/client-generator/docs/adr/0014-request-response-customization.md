# ADR 0014: Request/response customization as a runtime contract

- Status: Accepted
- Date: 2026-06-26

## Context

Consumers need to shape requests and responses the generator cannot know about: add a header to some endpoints, attach a trace/idempotency key, swap the transport, retry differently, map errors to domain types, rewrite a URL behind a gateway, log and measure.
The naive path — hand-editing the generated client — loses every change on the next regenerate, which defeats codegen.

The generated client already ships a runtime extension surface for most of this ([ADR-0001](./0001-ast-codegen.md) emits it verbatim into every client):

- `ClientConfig` — `baseUrl`, `headers` (static or per-request function), `fetch` (transport), `onRequest` / `onResponse` / `onError` hooks, a composable `middleware[]` onion, and `retry`.
- `RequestContext` — `{ url, method, headers, body }` handed to `onRequest`; `url`/`method`/`headers` are mutable.
- `RequestOptions` — the trailing per-call argument (`RequestInit & { retry, parseAs }`), merged over the global config.
- `configure()` / `use()` for the functions facade; `new Client(config)` / `client.use()` per instance for the service-class facade.
- Auth is its own resolved seam ([ADR-0007](./0007-call-site-auth.md), [ADR-0009](./0009-per-instance-auth.md)); response validation is the `zod` generator; framework glue is the wrapper generators ([ADR-0011](./0011-wrapper-generators.md)).

The question this ADR settles is **where customization lives** — and which of the remaining gaps we close.
The codegen-time alternatives considered (a dedicated plugin, extending the `transformers` generator, or an `--extension custom.ts` flag that stitches consumer code into the output) all push runtime, per-environment behavior into generate time and re-introduce the regenerate coupling we are trying to remove.

Auditing the surface against real needs leaves three genuine gaps:

1. **Targeting by operation identity.** Middleware can only match on `ctx.url` / `ctx.method`, so "all `admin`-tagged operations" or "the `createOrder` operation" can only be expressed as brittle URL regexes — `RequestContext` carries no `operationId`, `tags`, or path template.
2. **Request body mutation is silently ignored.** The body is serialized into the fetch payload _before_ `onRequest` runs, and the fetch sends that payload — not `ctx.body`. So mutating `ctx.body` (case conversion, enveloping, signing) is a footgun: it type-checks and does nothing.
3. **Typed-result enrichment.** Middleware sees only the raw `Response`, not the deserialized value, so enriching the typed result is impossible without reconstructing a `Response`.

## Decision

**Request/response customization is a runtime contract — the `ClientConfig` hooks, the `middleware[]` onion, and the per-call `RequestOptions` — never a codegen-time seam.** We will not add a customization plugin, extend `transformers` for it, or add a flag that merges consumer code into the generated output. The generated client stays a pure projection of the spec; everything spec-independent is composed from the outside by consumer-owned modules that survive regeneration.

We close the prioritized gaps by **extending the same runtime contract**, additively:

1. **Operation metadata in `RequestContext`.** Thread the operation's identity into the context the runtime builds — at minimum `operationId`, plus `tags` and the path template (the `path` before parameter interpolation). Middleware then targets requests semantically (`ctx.operationId === 'createOrder'`, `ctx.tags.includes('admin')`) instead of by URL shape. Emitted into every client; the existing `url`/`method`/`headers` fields are unchanged.
2. **Make the request body mutable in `onRequest`.** Serialize the payload from `ctx.body` _after_ the `onRequest` chain runs, so body transforms take effect. The default behavior (JSON-encode a plain object, pass through `Blob`/`FormData`/string) is unchanged when no hook touches the body.

We **defer typed-result enrichment** (gap 3): it weakens the contract's type safety and has no concrete demand — the raw-`Response` `onResponse` hook covers the asked-for cases. Revisit only on a real need.

## Consequences

- The customization story is one consumer-owned setup module (`configure`/`use` or `new Client`), not a generator feature — no merge step, no regenerate loss, no new CLI surface.
- Operation metadata makes "some requests" first-class and stable across path changes, and is purely additive — existing middleware keeps working.
- Fixing body mutation removes a silent footgun and unlocks request-body transforms (case conversion, enveloping, signing) without a new hook.
- Emitting operation metadata adds a small per-request object and slightly larger output; acceptable for the targeting it enables. It is always emitted (not gated), keeping the contract uniform across clients.
- Deferring typed-result enrichment keeps the response hook honest (raw `Response` in, raw `Response` out) and leaves type safety intact; consumers needing a derived field compute it at the call site for now.
- Query serialization beyond OpenAPI `style`/`explode` remains out of scope — rewrite `ctx.url` in `onRequest` if needed; not worth a dedicated hook absent demand.
