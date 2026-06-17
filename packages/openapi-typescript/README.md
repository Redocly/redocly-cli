# @redocly/openapi-typescript

> ⚠️ **Experimental.** This package and the client generator are released as **experimental**: the generated output, options, and the plugin API may change in any minor release until it is declared stable (see [ADR-0013](./docs/adr/0013-experimental-status.md)).
> Pin your version if you depend on the output, and expect to regenerate when you upgrade.
> Feedback is very welcome while we stabilize it.

Generate a typed TypeScript client (inline types + `fetch` runtime) from an OpenAPI description.
The emitted client has **zero runtime dependencies** — it uses only web-standard APIs (`fetch`, `AbortController`, `URLSearchParams`, …), so it runs in browsers, Node ≥ 18, Bun, Deno, and edge runtimes.
Code is produced through the TypeScript compiler AST (not string templates), so output is correct by construction; `typescript` is the only (peer) dependency.

This package is the engine behind the **`redocly generate-client`** command.
To run it from the command line, install [`@redocly/cli`](https://github.com/Redocly/redocly-cli) and see the [`generate-client` command reference](https://redocly.com/docs/cli/commands/generate-client).
The rest of this README covers using the package **programmatically**.

## Features

- **Broad input** — OpenAPI **3.0, 3.1, and 3.2.0**, plus **Swagger 2.0** (normalized to 3.x before generation)
  `input` is a file path or URL.
- **Zero-dependency client** built via the TS AST, with `typescript` as the only peer dep
- **Output modes** — `single`, `split`, `tags`, `tags-split` (`outputMode`)
- **Facades** — standalone `functions` or a `service-class` (`facade`), the latter supporting **per-instance configuration and credentials** (`new Client({ auth, baseUrl, … })`)
- **Argument styles** — `flat` positional args or a `grouped` `vars` object (`argsStyle`)
- **Rich types** — inline types for every schema:
  - string enums as unions or runtime `const` objects (`enumStyle`)
  - **discriminated-union `is<Member>()` type guards** `<Op>Result` / `Error` / `Params` / `Body` / `Headers` / `Variables` aliases (collision-suppressed)
  - validation keywords surfaced as JSDoc
  - `dateType: 'Date'`
  - **typed `multipart/form-data` bodies** (object fields, binary → `Blob`) auto-serialized to `FormData`
- **Runtime** — `setBaseUrl` + a typed `ClientConfig` (headers, `fetch` swap, hooks):
  - **composable middleware** (`onRequest`/`onResponse`/`onError`)
  - **opt-in, abort-aware retries** with backoff, jitter, `Retry-After`, and a custom `retryOn`
  - per-call response decoding (`parseAs`)
  - OpenAPI **query-serialization styles**
  - `errorMode: 'result'` for a discriminated `{ data, error, response }`
  - a minification-safe `OPERATIONS` metadata map
- **Auth** — Basic / Bearer / apiKey (header, query, cookie) setters from `securitySchemes`, async token providers, and per-instance credentials via `ClientConfig.auth`
- **Server-Sent Events** — `text/event-stream` operations as typed async iterators with auto-reconnect; payloads typed from OpenAPI 3.2 `itemSchema`
- **Generators** (`generators`) — `sdk` (default), `zod`, `tanstack-query` (React/Vue/Svelte/Solid), `swr`, `transformers`, `mock` (MSW handlers + baked or `faker` data), and a [custom-generator plugin API](#custom-generators)
- **Hardened** — document-derived names coerced to safe unique identifiers, comment text escaped, and a bounded SSE reader

Every add-on generator keeps the emitted client dependency-free; its peer library is needed only in your app.

## Use programmatically

`generateClient(options)` is the API behind the CLI command — it loads the spec, builds the client, and writes the files:

```ts
import { generateClient } from '@redocly/openapi-typescript';

const result = await generateClient({
  input: 'openapi.yaml', // file path or URL
  output: 'src/client.ts', // entry file; siblings derive from it in multi-file modes
  outputMode: 'single', // 'single' | 'split' | 'tags' | 'tags-split'
  facade: 'functions', // 'functions' | 'service-class'
  argsStyle: 'flat', // 'flat' | 'grouped'
  errorMode: 'throw', // 'throw' | 'result'
  dateType: 'string', // 'string' | 'Date' (pair 'Date' with the 'transformers' generator)
  enumStyle: 'const-object', // 'const-object' | 'union'
  generators: ['sdk'], // see "Generators" below
  // baseUrl, name, queryFramework, mockData, mockSeed, customGenerators are also accepted
});

console.log(`Wrote ${result.files.length} file(s), ${result.bytes} bytes.`);
```

For type-safe option authoring, `defineConfig` returns its argument unchanged:

```ts
import { defineConfig } from '@redocly/openapi-typescript';

export default defineConfig({
  input: './openapi.yaml',
  output: './src/api/client.ts',
  generators: ['sdk', 'zod'],
});
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

The client also exports an `OPERATIONS` map (operationId → `{ method, path }`) plus `OperationId` / `OperationMetadata` types.
The string-literal keys and path templates survive minification, so they're the stable handle for cache/query keys, tracing span names, and request logging:

```ts
import { OPERATIONS, getOrderById } from './client.ts';

const queryKey = [OPERATIONS.getOrderById.path, orderId]; // "/orders/{orderId}"
```

## Generators

`generators` (default `['sdk']`) selects which files to emit.
The `sdk` client is always dependency-free; each add-on lands in its own sibling file and needs its peer library only in your app.

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
The hooks wrap the **throw-mode** sdk and support only the `functions` facade.

### Date transformers

By default `date-time`/`date` fields are typed `string`.
Set `dateType: 'Date'` to type them as `Date`, and add `'transformers'` to `generators` to emit a `<output>.transformers.ts` module of `transform<Name>` functions that convert wire ISO strings to `Date` at runtime:

```ts
import { getPet } from './client.ts';
import { transformPet } from './client.transformers.ts';

const pet = transformPet(await getPet(id)); // pet.createdAt is now a Date
```

The transformers import only the schema **types**, so the client stays dependency-free (`Date` is a web standard).
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
Factory signatures are identical in both modes; faker mode makes `@faker-js/faker` (`^9`) a dev dependency of your app (the client itself stays dependency-free).

## Custom generators

Need an output the built-ins don't ship — validators in another library, a UI permissions map, mocks in your test runner's format, an SDK in your house style?
Write a **custom generator**: it reads the same OpenAPI-derived model the built-ins do, runs in the same pass, and its output never drifts from the spec.

```ts
// route-map-generator.ts
import { defineGenerator } from '@redocly/openapi-typescript/plugin';

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
import generateClient from '@redocly/openapi-typescript';
import routeMap from './tools/route-map-generator.ts';

await generateClient({
  input: './openapi.yaml',
  output: './src/api/client.ts',
  customGenerators: [routeMap], // register…
  generators: ['sdk', 'route-map'], // …then select by name (or pass './tools/route-map-generator.ts')
});
```

`@redocly/openapi-typescript/plugin` also exports the IR types and the codegen toolkit the built-ins use (`ts`, `printStatements`, `operationSignature`, `schemaToTypeNode`, `pascalCase`, …).
A generator declares the same `requires`/`facades`/`errorModes`/`dateTypes` contract, validated up front.
The generated client stays dependency-free.
See `examples/custom-generator` for a runnable example.

## Server-Sent Events (streaming)

An operation whose `2xx` response declares `text/event-stream` is generated — with no option — as a typed async iterator under an `sse` namespace.
Each event's `data` is typed from the OpenAPI 3.2 `itemSchema` (falling back to the media `schema`, then `string`):

```ts
import { sse } from './client.ts';

for await (const ev of sse.streamMessages()) {
  console.log(ev.id, ev.data.text); // ev: ServerSentEvent<Message>
}
```

The stream **auto-reconnects** on a dropped connection, resuming via the `Last-Event-ID` header (backoff: server `retry:` → `reconnectDelay` → 1s, exponential with jitter, capped at 30s).
Tune or opt out per call (`{ reconnect: false }` / `{ reconnectDelay: 500 }`), and `break` or pass an `AbortSignal` to stop early — both end the iterator cleanly (no throw).
SSE operations always throw `ApiError` on an initial non-2xx and never return the `result`-mode shape.

## Examples

Runnable examples live in [`examples/`](./examples): `fetch-functions`, `service-class`, `zod`, `tanstack-query`, `mock`, and `custom-generator`.
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

The emitted runtime lives in `src/emitters/runtime.ts` (a template string), the structural emitters in `src/emitters/`, the IR in `src/ir/`, the generators in `src/generators/`, and the multi-file layout strategies in `src/writers/`.
