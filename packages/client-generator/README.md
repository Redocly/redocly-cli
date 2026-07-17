# @redocly/client-generator

> ⚠️ **Experimental.** This package and the client generator are released as **experimental**: the generated output, options, and the plugin API may change in any minor release until it is declared stable (see [ADR-0013](./docs/adr/0013-experimental-status.md)).
> Pin your version if you depend on the output, and expect to regenerate when you upgrade.
> Feedback is very welcome while we stabilize it.

Generate a typed TypeScript client (inline types + `fetch` runtime) from an OpenAPI description.
The emitted client has **zero runtime dependencies** by default — it uses only web-standard APIs (`fetch`, `AbortController`, `URLSearchParams`, …), so it runs in browsers, Node ≥ 18, Bun, Deno, and edge runtimes.
Opt in to `runtime: 'package'` to import the runtime from this package instead, so engine fixes arrive via `npm update` without regenerating.
Code is produced through the TypeScript compiler AST (not string templates), so output is correct by construction; `typescript` is the only (peer) dependency.

This package is the engine behind the **`redocly generate-client`** command.
To run it from the command line, install [`@redocly/cli`](https://github.com/Redocly/redocly-cli) and see the [`generate-client` command reference](https://redocly.com/docs/cli/commands/generate-client).
The rest of this README covers using the package **programmatically**.

## Features

- **Broad input** — OpenAPI **3.0, 3.1, and 3.2.0**, plus **Swagger 2.0** (normalized to 3.x before generation)
  `api` is a file path or URL.
- **Zero-dependency client** (the default `inline` runtime) built via the TS AST, with `typescript` as the only peer dep
- **Output modes** — `single` or `split` (schema types in a sibling `<stem>.schemas.ts`) (`outputMode`)
- **Runtime distribution** (`runtime`) — `inline` (default, self-contained) or `package`: the client imports its runtime from `@redocly/client-generator` (pure-data operation descriptors + a build-time version-skew guard), so engine fixes arrive via `npm update` — no regeneration
- **Both call styles, always** — a typed `client` instance (grouped-args methods, **per-instance configuration and credentials** via `createClient(OPERATIONS, { auth, serverUrl, … })`) plus free-function operations bound to it
- **Argument styles** — `flat` positional args or a `grouped` `vars` object (`argsStyle`)
- **Rich types** — inline types for every schema:
  - string enums as unions or runtime `const` objects (`enumStyle`)
  - **discriminated-union `is<Member>()` type guards** `<Op>Result` / `Error` / `Params` / `Body` / `Headers` / `Variables` aliases (collision-suppressed)
  - validation keywords surfaced as JSDoc
  - `dateType: 'Date'`
  - **typed `multipart/form-data` bodies** (object fields, binary → `Blob`) auto-serialized to `FormData`
- **Runtime** — a typed `ClientConfig` (`serverUrl`, headers, `fetch` swap, hooks) applied via `configure()`:
  - **composable middleware** (`onRequest`/`onResponse`/`onError`) whose `ctx.operation.id`/`path`/`tags` are the spec's **literal unions** — a misspelled operation id fails compilation
  - **opt-in, abort-aware retries** with backoff, jitter, `Retry-After`, and a custom `retryOn`
  - per-call response decoding (`parseAs`)
  - OpenAPI **query-serialization styles**
  - `errorMode: 'result'` for a discriminated `{ data, error, response }`
  - a minification-safe `OPERATIONS` metadata map
- **Auth** — Basic / Bearer / apiKey (header, query, cookie) setters from `securitySchemes`, async token providers, and per-instance credentials via `ClientConfig.auth`
- **Server-Sent Events** — `text/event-stream` operations as typed async iterators with auto-reconnect; payloads typed from OpenAPI 3.2 `itemSchema`
- **Auto-pagination** — declared via the `pagination` option (a statically verified convention rule + per-operation overrides) or the spec's `x-pagination` extension (`cursor`/`offset`/`page` styles); paginated operations keep their one-shot call and gain `.pages()`/`.items()` async iterators, item types resolved from the response schema at generate time
- **Generators** (`generators`) — `sdk` (default), `zod`, `tanstack-query` (React/Vue/Svelte/Solid), `swr`, `transformers`, `mock` (MSW handlers + baked or `faker` data), and a [custom-generator plugin API](#custom-generators)
- **Hardened** — document-derived names coerced to safe unique identifiers, comment text escaped, and a bounded SSE reader

No add-on generator adds a dependency to the emitted client; its peer library is needed only in your app.

## Use programmatically

`generateClient(options)` is the API behind the CLI command — it loads the spec, builds the client, and writes the files:

```ts
import { generateClient } from '@redocly/client-generator';

const result = await generateClient({
  api: 'openapi.yaml', // file path or URL
  output: 'src/client.ts', // entry file; the .schemas.ts sibling derives from it in split mode
  outputMode: 'single', // 'single' | 'split'
  runtime: 'inline', // 'inline' | 'package' (import the runtime from this package)
  argsStyle: 'flat', // 'flat' | 'grouped'
  errorMode: 'throw', // 'throw' | 'result'
  dateType: 'string', // 'string' | 'Date' (pair 'Date' with the 'transformers' generator)
  enumStyle: 'const-object', // 'const-object' | 'union'
  generators: ['sdk'], // see "Generators" below
  // serverUrl, queryFramework, mockData, mockSeed, pagination, customGenerators are also accepted
});

console.log(`Wrote ${result.files.length} file(s), ${result.bytes} bytes.`);
```

For type-safe authoring of a standalone options object, annotate it with `satisfies Config`:

```ts
import { generateClient, type Config } from '@redocly/client-generator';

const options = {
  api: './openapi.yaml',
  output: './src/api/client.ts',
  generators: ['sdk', 'zod'],
} satisfies Config;

await generateClient(options);
```

To inspect the output without writing to disk, the lower-level `collectGeneratedFiles(model, opts)` returns the files in memory (see `src/index.ts`).

## Using the generated client

```ts
import { configure, use, getOrderById, listMenuItems, setBearer } from './client.ts';

// Optional: global config (base URL, headers, fetch swap, hooks, retry).
configure({ retry: { retries: 3 } });

// Composable middleware for cross-cutting concerns (logging, tracing, auth refresh).
use({
  onRequest: (ctx) => {
    ctx.headers['X-Request-Id'] = crypto.randomUUID();
  },
});

// Auth helpers are generated from the spec's `securitySchemes`.
setBearer(token);

const menu = await listMenuItems({ limit: 10 });
const order = await getOrderById('ord_01khr487f7qm7p44xn427m43vb');

// Per-call options (AbortSignal, retry override) go in the trailing `init` arg.
const live = await listMenuItems({ limit: 10 }, { signal: controller.signal });
```

Each operation's trailing `init` argument is `RequestOptions` (`RequestInit` plus an optional per-call `retry` override and a `parseAs` reader).
Retry is opt-in and abort-aware.
A custom `retryOn(ctx)` predicate can branch on `ctx.error` (transport failure) or `ctx.response` (HTTP status / body) and opt a `POST` in.

By default a response body is decoded by negotiating from its `Content-Type`.
Pass `parseAs` in `init` to force a reader — `'json'`, `'text'`, `'blob'`, `'arrayBuffer'`, `'formData'`, `'stream'` (the raw `ReadableStream`), or `'auto'` (the default):

```ts
const stream = await getMenuItemPhoto('prd_…', { parseAs: 'stream' }); // ReadableStream
```

`parseAs` is a **runtime override only** — it does not change the operation's static return type.
Forcing a reader that disagrees with the schema is the caller's responsibility.

Query parameters honor their OpenAPI serialization style.
The default (`form` + `explode: true`) repeats array values.
Declare `style` / `explode` / `allowReserved` on a parameter to get `form`+`explode:false` (`key=a,b`), `spaceDelimited` (`key=a%20b`), `pipeDelimited` (`key=a|b`), `deepObject`, or reserved-char passthrough.

A setter is generated for each injectable scheme — `setBearer` (HTTP `bearer` / OAuth2), `setBasicAuth(username, password)` (HTTP `basic`), and `setApiKey…` for `apiKey` schemes in header, query, or cookie — and each operation sends the credentials its `security` requires.
Each setter is instance-bound sugar over the exported client (`export const setBearer = client.auth.bearer;`); credentials are **per instance** (`ClientConfig.auth`), so independent instances built with `createClient(OPERATIONS, { auth })` carry independent credentials — the generated module exports `createClient` in both runtimes (see the [`multi-instance` example](./examples/multi-instance)).
Bearer/apiKey credentials accept a `TokenProvider` (a string or a possibly-async function resolved per request) for refresh-token flows:

```ts
import { setBearer, setBasicAuth, setApiKey } from './client.ts';

setBearer(async () => await getFreshAccessToken()); // resolved before each authed call
setBasicAuth('alice', 's3cr3t'); // `Authorization: Basic <base64>`
setApiKey('my-api-key'); // header / query / cookie, per the scheme's `in`
```

With `argsStyle: 'grouped'`, inputs are bundled into a single `vars` object (typed as the operation's `<Op>Variables`) instead of positional arguments, while `init` stays the trailing argument:

```ts
const order = await getOrderById({ orderId: 'ord_01khr487f7qm7p44xn427m43vb' });
```

With `errorMode: 'result'`, operations don't throw on non-2xx.
Each operation returns a discriminated `{ data, error, response }` whose `error` is typed from the spec's 4xx/5xx bodies (the `<Op>Error` union).
On success `error` is `undefined`; the HTTP status is always on `response.status`:

```ts
const { data, error, response } = await getOrderById('ord_01khr487f7qm7p44xn427m43vb');
if (error)
  console.error(response.status, error); // `error` is the typed body
else console.log(data.id); // `data` is the success body
```

Transport/abort failures still throw in both modes.

The client also exports an `OPERATIONS` map (operationId → `{ method, path, tags }`) plus the `OperationId` / `OperationPath` / `OperationTag` / `OperationMetadata` types.
The string-literal keys, path templates, and tags survive minification, so they're the stable handle for cache/query keys, tracing span names, and request logging:

```ts
import { OPERATIONS, getOrderById } from './client.ts';

const queryKey = [OPERATIONS.getOrderById.path, orderId]; // "/orders/{orderId}"
```

### Customizing requests and responses

You shape requests and responses from your own code — never by editing the generated client, so changes survive regeneration.
Middleware (`use(...)` — sugar for `client.use(...)`, so it registers on that instance) hooks the request lifecycle, and each `RequestContext` carries the operation's identity so you can target by operationId or tag instead of brittle URL matching.
`onRequest` may mutate `ctx.url` / `ctx.method` / `ctx.headers` **and `ctx.body`**; `onResponse` may observe or replace the `Response`:

```ts
import { configure, use, listMenuItems } from './client.ts';

// A custom transport — proxy, instrument, or (here) swap fetch entirely.
configure({ fetch: myFetch });

use({
  onRequest: (ctx) => {
    // Target specific operations by identity, not URL shape.
    if (ctx.operation.id === 'createOrder' || ctx.operation.tags.includes('Orders')) {
      ctx.headers['X-Idempotency-Key'] = crypto.randomUUID();
      (ctx.body as { source?: string }).source = 'web'; // body edits are sent
    }
  },
  onResponse: (response, ctx) => {
    console.debug(ctx.operation.id, response.status);
  },
});

// A header for one call only goes in the trailing RequestOptions.
await listMenuItems({}, { headers: { 'X-Request-Id': '42' } });
```

`ctx.operation` is `{ id, path, tags }` — the operationId, the path template (`{param}` placeholders intact), and the operation's tags. All three are **typed literal unions** (`OperationId` / `OperationPath` / `OperationTag`, exported alongside the `OPERATIONS` map), so `ctx.operation.id === '…'` and `ctx.operation.tags.includes('…')` autocomplete and reject typos at compile time.
See the [`configure-and-middleware` example](../../tests/e2e/generate-client/examples/configure-and-middleware) for a runnable end-to-end version, and [ADR-0014](./docs/adr/0014-request-response-customization.md) for the rationale.

### Baking defaults into a published SDK

The customization above is composed by the **consumer**. If you instead **publish an SDK** and want those defaults already active for _your_ users, bake them in at generation time with `--setup <file>`. The setup module imports its contract from `@redocly/client-generator` (so it resolves and is unit-testable before the client is generated) and returns a `defineClientSetup({ config, middleware })`:

```ts
// client-setup.ts
import { defineClientSetup, type RequestContext } from '@redocly/client-generator';

export default defineClientSetup({
  config: { serverUrl: 'https://api.acme.com', retry: { retries: 3 } },
  middleware: [
    {
      onRequest: (ctx: RequestContext) => {
        ctx.headers['X-Acme-SDK'] = '1.4.0';
        if (ctx.operation.tags.includes('Orders'))
          ctx.headers['X-Idempotency-Key'] = crypto.randomUUID();
      },
    },
  ],
});
```

```sh
redocly generate-client openapi.yaml --output src/api/client.ts --setup ./client-setup.ts
```

The generator bakes the `config`/`middleware` into the generated client, so the published package applies them on import — your users call operations with no setup of their own, and can still override (their `configure`/`use` run after the baked ones; config layers spec defaults → baked setup → app `configure()`, middleware composes). Works across both output modes and both runtimes. A setup file may import **only** from `@redocly/client-generator`, so it never adds a dependency to the client.

See the [`baked-setup` example](./examples/baked-setup) and [ADR-0015](./docs/adr/0015-publisher-setup-bake-in.md).

## Testing the generated client

The client is plain `fetch` code, so you test it like any HTTP code — there is no special harness.

**In Node** (scripts, Vitest/Jest) there is **no CORS** — point it at any reachable API and call it:

```ts
import { configure, listMenuItems } from './client.ts';

configure({ serverUrl: 'https://api.example.com' });
const items = await listMenuItems(); // resolves or throws ApiError
```

**In the browser, CORS applies** — and it's the **target API's** policy, not the client's. Two things
to watch:

- The API must allow your origin (`Access-Control-Allow-Origin`).
- Any **custom request header** you add (e.g. `X-Request-Id` via `use({ onRequest })` middleware)
  triggers a **CORS preflight**, so the API must also list that header in `Access-Control-Allow-Headers`
  — otherwise the browser blocks the request and `fetch` throws `TypeError: Failed to fetch`. If the
  API doesn't allow it, drop the header, use a dev proxy (e.g. Vite's `server.proxy`), or mock the API.

**Without a backend (recommended for tests and local dev), use MSW mocks.** Add `mock` to
`generators` to emit an MSW handler module; requests are intercepted in-process, so there's **no real
network and no CORS** — the same client runs unchanged against the mocks:

```ts
import { setupServer } from 'msw/node'; // or 'msw/browser' for the browser
import { handlers } from './client.mocks.ts';

const server = setupServer(...handlers);
beforeAll(() => server.listen());
afterAll(() => server.close());

// now calls to the generated client resolve from the mocks
```

The repo's [`examples/`](./examples) are runnable end-to-end: `npm install && npm run dev` in an
example directory serves it on `http://localhost:5173` against the live demo API (a CORS-enabled
`GET`), and `examples/mock` shows the MSW-backed flow.

## Generators

`generators` (default `['sdk']`) selects which files to emit.
The `sdk` client is dependency-free with the default `inline` runtime; each add-on lands in its own sibling file and needs its peer library only in your app.
Every generator works with both runtimes and both output modes.

### Runtime validation with Zod

`generators: ['sdk', 'zod']` emits a standalone `<output>.zod.ts` module of [Zod](https://zod.dev) schemas (one `export const <Name>Schema` per schema).
The generated client never imports Zod; only the `*.zod.ts` module does.
Install Zod in your app as a peer — any `zod` `^3.23 || ^4`:

```ts
import { z } from 'zod';
import type { Pet } from './client.ts';
import { PetSchema } from './client.zod.ts';

const pet: Pet = PetSchema.parse(await res.json()); // z.infer<typeof PetSchema> === Pet
```

Schemas carry the validation refinements stable across Zod 3.23 and 4 (`.min`/`.max`, `.gt`/`.lt`, `.int`, `.regex`).
Refs become `z.lazy(() => …)` so recursive schemas work.
Format helpers (`.email`/`.uuid`/`.url`) are not emitted, since they diverge between Zod 3 and 4.

The module also emits `operationSchemas` (request/response validators keyed by operationId) and the `zodValidation` middleware:

```ts
import { use } from './client.ts';
import { zodValidation } from './client.zod.ts';

use(zodValidation()); // request bodies validated before the wire; JSON responses after it
```

A mismatch throws `ZodValidationError` (`operationId`, `direction`, zod `issues`); payloads are never mutated.

### TanStack Query

`generators: ['sdk', 'tanstack-query']` emits a standalone `<output>.tanstack.ts` module of [TanStack Query](https://tanstack.com/query) v5 factories wrapping the sdk operations.
Each query op (`GET`/`HEAD`) gets a `<op>QueryKey`/`<op>Options` factory (returning `queryOptions`).
Each mutation gets a `<op>Mutation` factory (returning `mutationKey`/`mutationFn`):

```ts
import { useQuery, useMutation } from '@tanstack/react-query';
import { getPetOptions, createPetMutation } from './client.tanstack.ts';

const { data } = useQuery(getPetOptions({ id }));
const { mutate } = useMutation(createPetMutation());
```

Only the `*.tanstack.ts` module imports TanStack Query; install it as a peer — any `@tanstack/react-query` `^5`.
The factories wrap the **throw-mode** sdk (the default), since TanStack's `queryFn` is expected to throw on error.

**Framework** — TanStack's `queryOptions`/`mutationOptions` API is identical across adapters, so the emitted module is byte-identical across frameworks; only the import specifier differs.
Set `queryFramework` to `react` (default), `vue`, `svelte`, or `solid` and install the matching adapter (`@tanstack/<framework>-query`, any `^5`).

### SWR

`generators: ['sdk', 'swr']` emits a standalone `<output>.swr.ts` module of [SWR](https://swr.vercel.app) hooks.
Each query op (`GET`/`HEAD`) gets a `<op>Key` tuple factory + a `use<Op>(vars, init?)` hook over `useSWR`; each mutation gets a `use<Op>()` hook over `useSWRMutation`:

```ts
import { useGetPetById, useCreatePet } from './client.swr.ts';

const { data } = useGetPetById({ id });
const { trigger } = useCreatePet();
await trigger({ body: { name: 'Rex' } });
```

Only the `*.swr.ts` module imports SWR (`swr` for queries, `swr/mutation` for mutations); install it as a peer — any `swr` `^2`.
The hooks wrap the **throw-mode** sdk functions.

### Date transformers

By default `date-time`/`date` fields are typed `string`.
Set `dateType: 'Date'` to type them as `Date`, and add `'transformers'` to `generators` to emit a `<output>.transformers.ts` module of `transform<Name>` functions that convert wire ISO strings to `Date` at runtime:

```ts
import { getPet } from './client.ts';
import { transformPet } from './client.transformers.ts';

const pet = transformPet(await getPet(id)); // pet.createdAt is now a Date
```

The transformers import only the schema **types**, so they add no dependency to the client (`Date` is a web standard).
`int64` → `bigint` is deferred; without `dateType: 'Date'` the date fields stay `string`.

### MSW mocks

`generators: ['sdk', 'mock']` emits a standalone `<output>.mocks.ts` module of [MSW](https://mswjs.io) v2 request handlers and `create<Schema>(overrides?)` data factories.
Each handler intercepts its operation's method + path and responds with a fixture baked from the spec (prefers `example`/`default`; `format: binary` → `new Blob([])`.
Recursive schemas terminate at the cycle with an empty array/record).
Each `create<Schema>` factory builds the same default object and merges `overrides`, so factories double as test builders.
Install MSW as a dev dependency — `msw` `^2`:

```ts
// test setup (Node)
import { setupServer } from 'msw/node';
import { handlers } from './client.mocks';

const server = setupServer(...handlers);
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// override a single factory for one case
import { createMenuItem } from './client.mocks';
const special = createMenuItem({ name: 'Cold Brew', price: 499 });
```

**Realistic data with faker** — mock data is **baked** by default (deterministic literals, no extra dependency).
Set `mockData: 'faker'` to emit [`@faker-js/faker`](https://fakerjs.dev) calls for realistic data, and `mockSeed: <n>` to pin faker's PRNG so the data is reproducible.
Factory signatures are identical in both modes; faker mode makes `@faker-js/faker` (`^9`) a dev dependency of your app (the client itself gains no dependency).

## Custom generators

Need an output the built-ins don't ship — validators in another library, a UI permissions map, mocks in your test runner's format, an SDK in your house style?
Write a **custom generator**: it reads the same OpenAPI-derived model the built-ins do, runs in the same pass, and its output never drifts from the spec.

```ts
// route-map-generator.ts
import { defineGenerator } from '@redocly/client-generator';

export default defineGenerator({
  name: 'route-map',
  requires: ['sdk'],
  run({ model, outputPath }) {
    const routes = model.services
      .flatMap((service) => service.operations)
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

Select it in `generators` by import specifier (a path or package), or register it inline and select it by `name`:

```ts
import { generateClient } from '@redocly/client-generator';
import routeMap from './tools/route-map-generator.ts';

await generateClient({
  api: './openapi.yaml',
  output: './src/api/client.ts',
  customGenerators: [routeMap], // register…
  generators: ['sdk', 'route-map'], // …then select by name (or pass './tools/route-map-generator.ts')
});
```

`@redocly/client-generator` also exports the IR types and the codegen toolkit the built-ins use (`ts`, `printStatements`, `operationSignature`, `schemaToTypeNode`, `pascalCase`, …).
A generator declares the same `requires`/`errorModes`/`dateTypes`/`runtimes` contract, validated up front.
A custom generator never adds dependencies to the generated client.
See `examples/custom-generator` for a runnable example.

## Server-Sent Events (streaming)

An operation whose `2xx` response declares `text/event-stream` is generated — with no option — as a typed **async-generator** client method plus the matching free function.
Each event's `data` is typed from the OpenAPI 3.2 `itemSchema` (falling back to the media `schema`, then `string`):

```ts
import { streamMessages } from './client.ts';

for await (const ev of streamMessages()) {
  console.log(ev.id, ev.data.text); // ev: ServerSentEvent<Message>
}
```

The stream **auto-reconnects** on a dropped connection, resuming via the `Last-Event-ID` header (backoff: server `retry:` → `reconnectDelay` → 1s, exponential with jitter, capped at 30s).
Tune or opt out per call (`{ reconnect: false }` / `{ reconnectDelay: 500 }`), and `break` or pass an `AbortSignal` to stop early — both end the iterator cleanly (no throw).
SSE operations always throw `ApiError` on an initial non-2xx and never return the `result`-mode shape.

## Auto-pagination

Pagination is **declared, never guessed** — in the `pagination` option (or `redocly.yaml` `client.pagination`; the spec's `x-pagination` operation extension takes the same fields).
A convention rule applies to every operation it **structurally fits** (the advance param is a declared query parameter of the right type; the JSON pointers resolve in the JSON success-response schema, `items` landing on an array); an explicit rule (an `operations` override or `x-pagination`) that doesn't fit fails generation.
Precedence per operation: `operations[id]` > `x-pagination` > convention; `exclude` wins over all.

```ts
await generateClient({
  api: './openapi.yaml',
  output: './src/api/client.ts',
  pagination: {
    style: 'cursor', // 'cursor' | 'offset' | 'page'
    cursorParam: 'cursor', // the query param that receives the cursor
    nextCursor: '/nextCursor', // JSON pointer to the next cursor in the response
    items: '/orders', // JSON pointer to the page's item array
  },
});
```

Each paginated operation keeps its one-shot call and gains `.pages(args?, init?)` / `.items(args?, init?)` async iterators (the flat function too — note its iterators take the **grouped** args shape while the function itself stays positional).
Item types are resolved from the response schema at generate time — no runtime reflection:

```ts
import { client, listOrders } from './client.ts';

for await (const order of client.listOrders.items({ params: { limit: 20 } })) {
  console.log(order.id); // `order` is typed `Order`
}

await listOrders({ limit: 20 }); // flat one-shot: positional
for await (const page of listOrders.pages({ params: { cursor: 'c2' } })) {
  // resume from a saved cursor; pass `{ signal }` as `init` to abort mid-iteration
}
```

`cursor` style stops when `nextCursor` is absent/`null`/empty (and throws if the cursor doesn't advance); `offset`/`page` styles stop on an empty page.
Iteration is error-mode-agnostic: a failed page throws `ApiError` even on `errorMode: 'result'` clients, where `.pages()` yields raw pages (not `{ data, error, response }` envelopes).
Inline output embeds the pagination module only when some operation paginates; `runtime: 'package'` clients receive pagination improvements via `npm update`.

## Examples

Runnable examples live in [`examples/`](../../tests/e2e/generate-client/examples): `zero-install-quickstart`, `fetch-functions`, `configure-and-middleware`, `baked-setup`, `sse-streaming`, `zod`, `tanstack-query`, `mock`, `custom-generator`, `programmatic`, `vendored-edge`, `package-runtime` (`runtime: 'package'` — engine fixes via `npm update`), `multi-instance` (per-tenant `createClient` instances over one generated module), `pagination` and `custom-pagination` (the declared convention vs. a hand-written helper), and `nested-facade` (a custom generator grouping operations by tag).
Each is a standalone Vite app with a checked-in, drift-checked generated client.

## Documentation

- [`generate-client` command reference](https://redocly.com/docs/cli/commands/generate-client) — CLI usage, every flag, and `redocly.yaml` configuration.
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) and the [ADRs](./docs/adr/) — how the package is built and why.

## Development

This package is part of the Redocly CLI monorepo. Run all commands from the repo root:

```sh
npm run compile                 # build this package
npm run unit                    # unit tests (this package is held at 100% coverage)
VITEST_SUITE=e2e npx vitest run tests/e2e/generate-client/   # behavioral e2e
```

The client runtime lives in `src/runtime/` (real, unit-testable modules; package mode imports them, inline mode embeds them via the generated `src/emitters/runtime-sources.ts` snapshot and the `src/emitters/inline-runtime.ts` assembler), the structural emitters in `src/emitters/`, the IR in `src/intermediate-representation/`, the generators in `src/generators/`, and the file-layout writers in `src/writers/`.
