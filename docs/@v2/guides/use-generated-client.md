# Use the generated client

How to consume the TypeScript client produced by [`generate-client`](../commands/generate-client.md): authentication, argument styles, error handling, middleware, retries, and the optional add-on generators.
For invoking the command itself (flags, output modes, config), see the [`generate-client` command reference](../commands/generate-client.md).

## Generators

`--generator` selects what to emit (default `sdk`).
Each non-`sdk` generator adds a standalone sibling module next to the client; the client itself never imports it, so an add-on never adds a dependency to the client.
Incompatible selections fail fast with an explanation.

| Generator        | Emits                                                                                                                                                                    | App peer dependency                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| `sdk`            | The typed client (default).                                                                                                                                              | none                                                     |
| `zod`            | `<output>.zod.ts` — [Zod](https://zod.dev) schemas + [validation middleware](#runtime-validation).                                                                       | `zod` `^3.23 \|\| ^4`                                    |
| `tanstack-query` | `<output>.tanstack.ts` — [TanStack Query](https://tanstack.com/query) v5 factories. React by default; `tanstack-query-vue`/`-svelte`/`-solid` switch the adapter import. | `@tanstack/<framework>-query` `^5`                       |
| `swr`            | `<output>.swr.ts` — [SWR](https://swr.vercel.app) hooks.                                                                                                                 | `swr` `^2`                                               |
| `mock`           | `<output>.mocks.ts` — [MSW](https://mswjs.io) v2 handlers + `create<Schema>` factories.                                                                                  | `msw` `^2` (+ `@faker-js/faker` for `--mock-data faker`) |
| `transformers`   | `<output>.transformers.ts` — `transform<Name>` functions that parse wire dates to `Date`.                                                                                | none                                                     |

```sh
redocly generate-client openapi.yaml --output src/client.ts --generator sdk --generator zod --generator mock
```

`tanstack-query` and `swr` wrap the throw-mode `sdk` functions, so they require `--error-mode throw`; `transformers` requires `--date-type Date`.
See the [`zod`](https://github.com/Redocly/redocly-cli/tree/main/tests/e2e/generate-client/examples/zod), [`tanstack-query`](https://github.com/Redocly/redocly-cli/tree/main/tests/e2e/generate-client/examples/tanstack-query), and [`mock`](https://github.com/Redocly/redocly-cli/tree/main/tests/e2e/generate-client/examples/mock) examples.

## Package runtime

By default the runtime is embedded in the generated file, so the client is self-contained.
With [`--runtime package`](../commands/generate-client.md#runtime-distribution) the generated file instead imports the runtime from `@redocly/client-generator` — your application code is **identical in both modes** (same exports, same call shapes); only where the engine lives changes.
Choose `package` when you want engine fixes and improvements via `npm update @redocly/client-generator`, with no regeneration.

Install the runtime as a regular dependency and set the mode in `redocly.yaml`:

```sh
npm install @redocly/client-generator
```

```yaml
client:
  runtime: package # default: inline (self-contained)
```

An incompatible generated-file/runtime pair fails your `tsc` build (the descriptor `satisfies` check) rather than misbehaving at runtime.
Package mode works with both output modes and every generator.
See the [`package-runtime` example](https://github.com/Redocly/redocly-cli/tree/main/tests/e2e/generate-client/examples/package-runtime).

## Run with Node directly

Node 22.7+ runs TypeScript natively (type stripping), so you can execute a script that uses the generated client with plain `node` — no `tsx`, no build step.
Node resolves import specifiers literally — there is no `.js` → `.ts` remap — so generate with [`--import-ext ts`](../commands/generate-client.md#options) to get real on-disk `.ts` specifiers, and import the client with a `.ts` extension in your own code:

```bash
redocly generate-client openapi.yaml -o src/api/client.ts --import-ext ts
```

```ts
// src/main.ts
import { listMenuItems } from './api/client.ts';

const menu = await listMenuItems({ limit: 3 });
```

```bash
node src/main.ts
```

Keep the default `js` when the client goes through `tsc` or a bundler — plain `tsc` rejects `.ts` specifiers unless the project enables `allowImportingTsExtensions`.
Loaders such as `tsx` remap `.js` to `.ts` themselves, so they work with the default.
See the [`node-native` example](https://github.com/Redocly/redocly-cli/tree/main/tests/e2e/generate-client/examples/node-native).

## Authentication

Credentials are **per instance**: they live in the client's config (`ClientConfig.auth`), and each operation automatically sends the credentials its `security` requires.
A setter is generated for each `securityScheme` the runtime can apply:

| Scheme                         | Setter                                    | Applied as                               |
| ------------------------------ | ----------------------------------------- | ---------------------------------------- |
| HTTP `bearer` / OAuth2         | `setBearer(token)`                        | `Authorization: Bearer <token>`          |
| HTTP `basic`                   | `setBasicAuth(user, pass)`                | `Authorization: Basic <base64>`          |
| `apiKey` (header/query/cookie) | `setApiKey(key)` / `setApiKey<Name>(key)` | the named header, query param, or cookie |

`setApiKey` is unsuffixed for a single apiKey scheme; otherwise each gets `setApiKey<SchemeName>`.
`mutualTLS` is not injectable.
Cookie apiKey credentials travel in the `Cookie` request header, which browsers refuse to set — cookie auth works only in server-side clients (the generator warns when a spec declares one).
Bearer and apiKey credentials accept a **`TokenProvider`** — a string or a (possibly async) function called per request, handy for refresh flows:

```ts
import { setBearer } from './client.ts';

setBearer(async () => await getFreshAccessToken());
```

Each setter is sugar over the exported `client` instance's `auth` member (`export const setBearer = client.auth.bearer;`), so it configures that instance.
Equivalently, pass credentials up front with `configure({ auth: { … } })` or set them via `client.auth.bearer(…)` / `client.auth.basic(…)` / `client.auth.apiKey(scheme, …)`.

For **multiple independent instances** with different credentials, build extra clients over the same generated descriptors — the generated module exports `createClient`, the `OPERATIONS` descriptors, and the `Ops` type in both runtimes:

```ts
import { createClient } from '@redocly/client-generator';
import { OPERATIONS, type Ops } from './client.ts';

const internal = createClient<Ops>(OPERATIONS, {
  serverUrl: 'https://api.example.com',
  auth: { basic: { username: 'svc', password: 's3cr3t' } },
});
const publicApi = createClient<Ops>(OPERATIONS, { serverUrl: 'https://api.example.com' }); // no auth
```

## Argument style

By default (`--args-style flat`) each operation takes positional arguments — path params in URL order, then `params` (query), `body`, `headers`, and `cookies` — with the per-call `init` last.
Cookie parameters are serialized into the `Cookie` request header, which browsers refuse to set — like cookie apiKey auth, they work only in server-side clients.
With `--args-style grouped`, every input is bundled into one `vars` object typed as the operation's `<Op>Variables`:

```ts
// flat (default)
await updateOrder('ord_01khr…', { ...orderBody });

// grouped — order-independent, a good fit for React Query / SWR mutationFns
await updateOrder({ orderId: 'ord_01khr…', body: { ...orderBody } });
```

## Error handling

By default (`--error-mode throw`) an operation throws `ApiError` on any non-2xx response and returns the success body directly.
With `--error-mode result` it never throws for HTTP errors, returning a discriminated `Result<TData, TError>` whose `error` is typed from the spec's 4xx/5xx bodies:

```ts
// throw (default)
try {
  const order = await getOrderById('ord_123');
} catch (err) {
  if (err instanceof ApiError) console.error(err.status, err.body);
}

// result
const { data, error, response } = await getOrderById('ord_123');
if (error) console.error(response.status, error.title);
else console.log(data.id);
```

Transport and abort failures still throw in both modes.
The choice is fixed at generate time.

## Middleware

Beyond the single `onRequest`/`onResponse`/`onError` hooks on `ClientConfig`, the client takes **composable middleware** for cross-cutting concerns (auth refresh, logging, tracing, request IDs).
Register with `use()` (sugar for `client.use()`); it accepts several at once:

```ts
import { use } from './client.ts';

use({
  onRequest: (ctx) => {
    // ctx.operation is { id, path, tags } — target by identity, not URL matching
    if (ctx.operation.tags.includes('Orders')) {
      ctx.headers['X-Idempotency-Key'] = crypto.randomUUID();
    }
  },
});
```

`onRequest` runs in registration order; `onResponse` runs in reverse (onion).
`onRequest` may mutate `ctx` (`url`, `method`, `headers`, and `body` — body edits are serialized and sent); `onResponse` may return a replacement `Response`.
`onError` (throw mode only) is threaded through each middleware.
`ctx.operation`'s fields are typed as the spec's literal unions (`OperationId`/`OperationPath`/`OperationTag`), so `ctx.operation.id === '…'` and `ctx.operation.tags.includes('…')` autocomplete, and a misspelled operation id fails compilation instead of silently never matching.
A header for a single call instead goes in that operation's trailing `init` argument.
Per-request headers merge lowest to highest: injected auth credentials, then typed header parameters, then the caller's `init.headers` — the caller always wins.

`use()` appends to the middleware chain, composing with any already-registered or baked-in middleware.
`configure({ middleware: [...] })` replaces the whole chain — use it to reset, but prefer `use()` to add to existing (including [publisher-baked](#publisher-defaults)) middleware.

See the [`configure-and-middleware` example](https://github.com/Redocly/redocly-cli/tree/main/tests/e2e/generate-client/examples/configure-and-middleware) for a runnable version.

## Publisher defaults

The middleware above is composed by the **consumer**.
If you **publish an SDK**, bake defaults in at generation time with `--setup <file>`.
Setup changes the client's built-in _behavior_; it emits no extra file — to derive additional artifacts from the spec, use [generators](#generators) instead.
The setup module imports its contract from `@redocly/client-generator` (so it resolves and is unit-testable) and default-exports `defineClientSetup({ config, middleware })`:

```ts
// client-setup.ts
import { defineClientSetup, type RequestContext } from '@redocly/client-generator';

export default defineClientSetup({
  config: { serverUrl: 'https://api.acme.com', retry: { retries: 3 } },
  middleware: [
    {
      onRequest: (ctx: RequestContext) => {
        ctx.headers['X-Acme-SDK'] = '1.4.0';
      },
    },
  ],
});
```

```sh
redocly generate-client openapi.yaml --output src/api/client.ts --setup ./client-setup.ts
```

Baking is a generation-time transform: the import is stripped and only the setup expression lands in the client, so an `inline` client stays zero-dependency.
`defineClientSetup` is optional typing sugar — a plain default-exported object works too, with no imports (and no dev-dependency on `@redocly/client-generator`):

```ts
// client-setup.ts — the same setup, importless
export default {
  config: { serverUrl: 'https://api.acme.com', retry: { retries: 3 } },
  middleware: [
    {
      onRequest: (ctx) => {
        ctx.headers['X-Acme-SDK'] = '1.4.0';
      },
    },
  ],
};
```

Either way the baked block is typed against the client's own contract in the generated file, so a shape mistake fails the consumer's `tsc`.

The baked block runs before the consumer's own setup.
**Config values** layer lowest → highest: the spec's defaults (e.g. `servers[0].url`) → the baked setup → the app's `configure()` — later always wins, so a consumer overrides a baked default.
**Middleware composes** instead (baked first, then the consumer's).
Express un-bypassable behavior as middleware, not a baked `fetch`.
A setup file may import **only** from `@redocly/client-generator`.
See the [`baked-setup` example](https://github.com/Redocly/redocly-cli/tree/main/tests/e2e/generate-client/examples/baked-setup).

## Retries

Retry is **opt-in**, configured through `ClientConfig` with an optional per-call override:

```ts
configure({ retry: { retries: 3 } }); // the module's client instance
const other = createClient<Ops>(OPERATIONS, { retry: { retries: 3 } }); // another instance
await getOrderById('ord_123', {}, { retry: { retries: 5 } }); // per call
```

By default only **idempotent** methods (`GET`, `HEAD`, `PUT`, `DELETE`, `OPTIONS`) are retried, on a network error or a transient status (`408`, `429`, `500`, `502`, `503`, `504`).
`POST`/`PATCH` are not, since re-sending can duplicate side effects — opt in with a custom `retryOn` when safe.
Backoff is exponential with full jitter (`retryStrategy: 'fixed'` for a constant delay); a `Retry-After` header takes precedence; an aborted `AbortSignal` stops retries immediately.

A retry **resends the same request** — the `onRequest` chain, `config.headers()`, and body serialization run once and are reused across attempts.
To refresh a token, signature, or timestamp per attempt, do it in `onResponse`/`onError` or a custom `retryOn` rather than expecting `onRequest` to re-run.

| `RetryConfig` field | Type                                                 | Default                                            |
| ------------------- | ---------------------------------------------------- | -------------------------------------------------- |
| `retries`           | `number`                                             | `0` (extra attempts after the first; `0` disables) |
| `retryDelay`        | `number`                                             | `1000` (base delay, ms)                            |
| `retryStrategy`     | `'fixed' \| 'exponential'`                           | `'exponential'`                                    |
| `jitter`            | `boolean`                                            | `true`                                             |
| `retryOn`           | `(ctx: RetryContext) => boolean \| Promise<boolean>` | idempotent-only predicate                          |

A custom `retryOn` receives the failed attempt's `RetryContext` (`attempt`, `request`, and exactly one of `response` / `error`) and **fully replaces** the default.
To inspect a response body, read `ctx.response.clone()` — the body is a single-use stream:

```ts
await createOrder(body, {
  retry: {
    retries: 3,
    retryOn: async (ctx) => {
      if (ctx.error) return true; // transport error
      return (ctx.response?.status ?? 0) >= 500; // server error
    },
  },
});
```

## Query serialization

Query parameters follow their OpenAPI `style` / `explode` / `allowReserved`.
The default (`form`, `explode: true`) repeats array values:

| `style`          | `explode` | `['a', 'b']` on the wire |
| ---------------- | --------- | ------------------------ |
| `form` (default) | `true`    | `key=a&key=b`            |
| `form`           | `false`   | `key=a,b`                |
| `spaceDelimited` | `false`   | `key=a%20b`              |
| `pipeDelimited`  | `false`   | `key=a\|b`               |

Delimiters are literal (values are still percent-encoded).
`allowReserved: true` leaves the RFC-3986 reserved set un-encoded.
Object-valued params serialize as `deepObject` brackets (`key[sub]=val`).

## Multipart uploads

A `multipart/form-data` body whose schema is an **object** is generated as a typed object; pass a plain object and the client serializes it to `FormData` (after the `onRequest` chain, so middleware can mutate it).
Binary fields (`format: binary`) are typed as `Blob`:

```ts
// type UploadBody = { file: Blob; orgId: string; tags?: string[] };
await upload({ file, orgId: 'org_1', tags: ['a', 'b'] });
```

`Blob`/strings pass through, arrays append one field per item, nested objects are JSON-encoded, `undefined`/`null` are skipped. A multipart body whose schema isn't a concrete object keeps the raw `FormData` type. `format: byte` (base64) stays a `string`.

## Response decoding

The client reads each response by negotiating from its `Content-Type` (JSON, then `text/*`, then `Blob`).
Force a reader per call with `parseAs`:

```ts
const res = await getMenuItemPhoto('prd_123', { parseAs: 'stream' });
```

`parseAs` accepts `'json'`, `'text'`, `'blob'`, `'arrayBuffer'`, `'formData'`, `'stream'`, or `'auto'` (default). It changes the runtime reader only, not the static return type.

## Runtime validation

The `zod` generator emits `operationSchemas` — request/response validators keyed by operationId — and the `zodValidation` middleware that wires them into the client:

```ts
import { use } from './api/client';
import { zodValidation } from './api/client.zod';

use(zodValidation()); // validate request bodies and JSON responses
```

An invalid request body throws before any network call; a successful JSON response that doesn't match its schema throws after it.
Both throw `ZodValidationError` (with `operationId`, `direction`, and the zod `issues`) — always thrown, even on result-mode clients.
Payloads are never mutated, and operations without a JSON body pass through untouched.
Pass `{ request: false }` or `{ response: false }` to narrow the scope, or import a schema from `operationSchemas` for a one-off check.

## Operation metadata

The client exports an `OPERATIONS` map keyed by operationId — the same **operation descriptors** the runtime routes requests by, holding each operation's `method`, `path` template, `tags`, and wire shape:

```ts
export const OPERATIONS = {
  getOrderById: { id: 'getOrderById', method: 'GET', path: '/orders/{orderId}', tags: ['Orders'] },
  // …
} as const satisfies Record<string, OperationDescriptor>;
```

Because keys and values are plain string literals, they survive bundling/minification — making `OPERATIONS` the stable handle for cache keys, span names, or log labels (rather than `fn.name`, which a minifier can rename).
The same `OperationId` / `OperationPath` / `OperationTag` unions type `ctx.operation` in middleware.

## Discriminated unions

A `oneOf` / `anyOf` with a usable discriminator gets an exported `is<Member>` type guard per member, taken from the spec's `discriminator` or inferred when every member pins a shared property to a distinct string `const`:

```ts
export type MenuItem = Beverage | Dessert;
export function isBeverage(value: MenuItem): value is Beverage { … }
```

Guards are also emitted for unions nested inside another schema (array items, property values) as long as every member is a named schema.
A union without a usable discriminator gets no guard.

## Server-Sent Events

An operation whose `2xx` response declares `text/event-stream` is generated as a typed **async-generator function** (a client method plus the matching free function) — no flag required.
Each event's `data` is typed from the OpenAPI 3.2 `itemSchema` (falling back to the media `schema`, then `string`) and `JSON.parse`d when structured:

```ts
import { streamMessages } from './client.ts';

for await (const ev of streamMessages()) {
  console.log(ev.id, ev.data.text); // ServerSentEvent<T>: { event?, data, id?, retry? }
}
```

The stream **auto-reconnects** on a dropped connection, resuming from the last event id via `Last-Event-ID` (backoff honors the server's `retry:`, then `reconnectDelay`, then 1s; capped at 30s).
Tune per call with `{ reconnect: false }` or `{ reconnectDelay: 500 }`.
`break`ing the loop or aborting an `AbortSignal` ends it cleanly (no throw).
SSE always throws `ApiError` on a non-2xx initial response, regardless of `--error-mode`.

## Pagination

Pagination is declared, never guessed: describe how your API paginates in `redocly.yaml` under `client.pagination`, or per operation with the `x-pagination` extension in the spec.
The rule fields, the generate-time verification, and the precedence between the convention, `x-pagination`, and per-operation overrides are documented in the [`client.pagination` reference](../configuration/reference/client.md#pagination-object); there is no CLI flag.
Each paginated operation keeps its one-shot call and gains two async iterators — `.pages(args?, init?)` yielding full pages and `.items(args?, init?)` yielding individual items, typed statically from the response schema.

Three styles are supported:
`cursor` sends the response's `nextCursor` back in `cursorParam`, stops when it's absent, `null`, or empty, and throws if the server returns the same cursor twice in a row.
For connection-style APIs whose cursor stays non-null on the last page, add the optional `hasMore` pointer (for example `/pageInfo/hasNextPage`) — iteration stops as soon as it resolves to `false`, skipping the follow-up empty request.
`offset` advances `offsetParam` by each page's item count, and `page` increments `offsetParam` by 1; both stop on an empty page.
`limitParam` is optional metadata for any style: the iterator never sets it, so pass your page size in `params` yourself.

```ts
import { client } from './client.ts';

for await (const order of client.listOrders.items({ params: { limit: 20 } })) {
  console.log(order.id); // `order` is `Order` — resolved from the response schema at generate time
}

for await (const page of client.listOrders.pages()) {
  console.log(page.orders.length); // each full page, last one included
}
```

The flat free functions keep both iterators, with one asymmetry to note: the flat function itself takes positional arguments, but its `.pages`/`.items` always take the grouped shape (they are the client method's iterators).

Resume by passing the advance param in the initial args — iteration starts from there instead of the beginning.
Abort by passing an `AbortSignal`, forwarded to every page request:

```ts
const controller = new AbortController();
for await (const page of client.listOrders.pages(
  { params: { cursor: 'c2' } }, // start from a saved cursor (or offset/page number)
  { signal: controller.signal }
)) {
  // …
}
```

A failed page always aborts iteration by throwing `ApiError`, even on an `--error-mode result` client — there `.pages()` yields raw pages (not `{ data, error, response }` envelopes; only the one-shot call keeps the envelope) and the throw-mode-only `onError` middleware hook is not invoked.

For shapes the built-in styles don't cover — for example a cursor that travels in the request body or a header — page with a small hand-written helper over the generated call, which stays fully typed end to end (see the [`custom-pagination` example](https://github.com/Redocly/redocly-cli/tree/main/tests/e2e/generate-client/examples/custom-pagination)).

## Custom generators

The built-in generators cover common targets.
For anything else derived from the same description (validators in another library, a permissions map, a house-style SDK), write a **custom generator**: it reads the same spec-agnostic model the built-ins consume, so its output never drifts from the spec.
A generator adds artifacts _next to_ the client — it doesn't change the generated client's behavior; for that, compose [middleware](#middleware) or bake [publisher defaults](#publisher-defaults).

A generator is `{ name, run }` (plus optional compatibility metadata); author it with `defineGenerator`:

```ts
// route-map-generator.ts
import { defineGenerator } from '@redocly/client-generator';

export default defineGenerator({
  name: 'route-map',
  requires: ['sdk'],
  run({ model, outputPath }) {
    const routes = model.services
      .flatMap((s) => s.operations)
      .map((op) => `  ${op.name}: '${op.method.toUpperCase()} ${op.path}',`)
      .join('\n');
    return [
      {
        path: outputPath.replace(/\.ts$/, '.routes.ts'),
        content: `export const routes = {\n${routes}\n} as const;\n`,
      },
    ];
  },
});
```

The `@redocly/client-generator/codegen` entry also exports the codegen toolkit (`ts`, `printStatements`, `parseStatements`, `operationSignature`, `schemaToTypeNode`, `pascalCase`, …), and the package root exports the IR types, so a custom generator emits TypeScript exactly as the first-party ones do.

Select it in `redocly.yaml` by path or package name:

```yaml
apis:
  cafe:
    root: ./openapi.yaml
    clientOutput: ./src/api/client.ts
    client:
      generators:
        - sdk
        - ./tools/route-map-generator.ts # local path (resolved against redocly.yaml)
        - '@acme/openapi-valibot' # published package
```

Or register one **inline** with the programmatic API and select it by name:

```ts
import { generateClient } from '@redocly/client-generator';
import routeMap from './tools/route-map-generator.ts';

await generateClient({
  api: './openapi.yaml',
  output: './src/api/client.ts',
  customGenerators: [routeMap],
  generators: ['sdk', 'route-map'],
});
```

Import-specifier generators execute at generation time — they carry the same trust level as any installed dependency you run.
See the [`custom-generator` example](https://github.com/Redocly/redocly-cli/tree/main/tests/e2e/generate-client/examples/custom-generator) for a minimal string-building plugin, and the [`nested-facade` example](https://github.com/Redocly/redocly-cli/tree/main/tests/e2e/generate-client/examples/nested-facade) for a realistic one that derives an `api.<resource>.<operation>` facade from the spec's tags.

## Resources

- [`generate-client` command](../commands/generate-client.md) — flags, output modes, and invocation.
- [`client` configuration](../configuration/reference/client.md) — the `redocly.yaml` `client` block.
