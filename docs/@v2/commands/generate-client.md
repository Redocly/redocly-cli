---
slug:
  - /docs/cli/commands/generate-client
---

# `generate-client`

{% admonition type="warning" name="Experimental" %}
`generate-client` is **experimental**: its flags, generated output, configuration schema, and custom-generator API may change in any minor release until it's stable.
We'd love your feedback while we stabilize it.
{% /admonition %}

Generate a typed TypeScript client from an OpenAPI 3.x description.
Swagger 2.0 descriptions are also accepted — normalized to the 3.x shape before generation.

The generated client has **zero runtime dependencies** — it uses only web-standard APIs (`fetch`, `AbortController`, `URLSearchParams`, …), so it runs in browsers, Node, Bun, Deno, and edge runtimes.
By default it emits a single file with inline types and one async function per operation.

## Usage

```sh
redocly generate-client <api> --output <file.ts>
redocly generate-client openapi.yaml --output src/client.ts
redocly generate-client cafe -o src/client.ts
```

`<api>` is a file path, a URL, or an [`apis:` alias](../configuration/index.md) from `redocly.yaml`.

## Options

| Option | Type | Description |
| --- | --- | --- |
| `api` | `string` | **REQUIRED.** OpenAPI description file path, URL, or an `apis:` alias from `redocly.yaml`. |
| `--output`, `-o` | `string` | **REQUIRED.** Output path; must end in `.ts`. In multi-file modes it's the entry file. |
| `--output-mode` | `string` | File layout: `single` (default), `split` (endpoints/schemas/runtime in sibling files), `tags` (one endpoints file per tag), or `tags-split` (a folder per tag). |
| `--generators` | `string` | Comma-separated generators to run (default `sdk`). See [Generators](#generators). |
| `--facade` | `string` | Operation shape: `functions` (default, standalone functions) or `service-class` (methods on a `Client` class). |
| `--name` | `string` | Class name for the `service-class` facade in `single`/`split` layouts. Default `Client`. |
| `--args-style` | `string` | Operation inputs: `flat` (default, positional) or `grouped` (a single `vars` object). See [Argument style](#argument-style). |
| `--enum-style` | `string` | Named string enums: `const-object` (default, `as const` object + union) or `union` (union only). |
| `--error-mode` | `string` | `throw` (default, throws `ApiError`) or `result` (returns `{ data, error, response }`). See [Error handling](#error-handling). |
| `--date-type` | `string` | `date`/`date-time` fields as `string` (default) or `Date` (pair with the `transformers` generator). |
| `--query-framework` | `string` | TanStack Query adapter: `react` (default), `vue`, `svelte`, or `solid`. |
| `--mock-data` | `string` | `mock` generator data: `baked` (default, deterministic literals) or `faker` (`@faker-js/faker` calls). |
| `--mock-seed` | `number` | Seed for `faker`-mode mocks, for reproducible data. Ignored in `baked` mode. |
| `--base-url` | `string` | Override the base URL inlined into the runtime. Defaults to `servers[0].url`. Accepts absolute (`https://api.example.com`) or relative (`/v1`). |
| `--setup` | `string` | Path to a publisher setup module baked into the client. See [Publisher defaults](#publisher-defaults). |
| `--config` | `string` | Path to the `redocly.yaml` holding the `x-client-generator` block. Defaults to the one in the working directory. |

## Configuration

Instead of passing flags every time, put the settings in `redocly.yaml` under an `x-client-generator` block.
`generate-client` reads it automatically (relative `api`/`output` resolve against the config file's directory):

```yaml
# redocly.yaml
x-client-generator:
  api: ./openapi.yaml
  output: ./src/api/client.ts
  generators:
    - sdk
  facade: service-class
```

```sh
redocly generate-client                          # uses redocly.yaml in the cwd
redocly generate-client --config ./config/redocly.yaml
```

For code-level control — including registering [custom generators](#custom-generators) inline — use the programmatic `generateClient(...)` API.

## Generators

`--generators` selects what to emit (default `sdk`). Each non-`sdk` generator adds a **standalone sibling module** next to the client; the client itself never imports it, so it stays dependency-free. Incompatible selections fail fast with an explanation.

| Generator | Emits | App peer dependency |
| --- | --- | --- |
| `sdk` | The typed client (default). | none |
| `zod` | `<output>.zod.ts` — [Zod](https://zod.dev) schemas. | `zod` `^3.23 \|\| ^4` |
| `tanstack-query` | `<output>.tanstack.ts` — [TanStack Query](https://tanstack.com/query) v5 factories. | `@tanstack/<framework>-query` `^5` |
| `swr` | `<output>.swr.ts` — [SWR](https://swr.vercel.app) hooks. | `swr` `^2` |
| `mock` | `<output>.mocks.ts` — [MSW](https://mswjs.io) v2 handlers + `create<Schema>` factories. | `msw` `^2` (+ `@faker-js/faker` for `--mock-data faker`) |
| `transformers` | `<output>.transformers.ts` — `transform<Name>` functions that parse wire dates to `Date`. | none |

```sh
redocly generate-client openapi.yaml --output src/client.ts --generators sdk,zod,mock
```

`tanstack-query` and `swr` wrap the **throw-mode** `sdk` functions, so they require `--facade functions` and `--error-mode throw`. `transformers` requires `--date-type Date`. See the [`zod`](https://github.com/Redocly/redocly-cli/tree/main/tests/e2e/generate-client/examples/zod), [`tanstack-query`](https://github.com/Redocly/redocly-cli/tree/main/tests/e2e/generate-client/examples/tanstack-query), and [`mock`](https://github.com/Redocly/redocly-cli/tree/main/tests/e2e/generate-client/examples/mock) examples.

## Authentication

A setter is generated for each `securityScheme` the runtime can apply, and each operation automatically sends the credentials its `security` requires:

| Scheme | Setter | Applied as |
| --- | --- | --- |
| HTTP `bearer` / OAuth2 | `setBearer(token)` | `Authorization: Bearer <token>` |
| HTTP `basic` | `setBasicAuth(user, pass)` | `Authorization: Basic <base64>` |
| `apiKey` (header/query/cookie) | `setApiKey(key)` / `setApiKey<Name>(key)` | the named header, query param, or cookie |

`setApiKey` is unsuffixed for a single apiKey scheme; otherwise each gets `setApiKey<SchemeName>`. `mutualTLS` is not injectable. Bearer and apiKey setters accept a **`TokenProvider`** — a string or a (possibly async) function called per request, handy for refresh flows:

```ts
import { setBearer } from './client.ts';

setBearer(async () => await getFreshAccessToken());
```

These setters are **module-global**. With `--facade service-class`, give each instance its own credentials via `ClientConfig.auth` (it overrides the global setters for that instance):

```ts
const internal = new Client({ auth: { basic: { username: 'svc', password: 's3cr3t' } } });
const publicApi = new Client(); // no auth
```

## Argument style

By default (`--args-style flat`) each operation takes positional arguments — path params in URL order, then `params` (query), `body`, and `headers` — with the per-call `init` last. With `--args-style grouped`, every input is bundled into one `vars` object typed as the operation's `<Op>Variables`:

```ts
// flat (default)
await updateOrder('ord_01khr…', { ...orderBody });

// grouped — order-independent, a good fit for React Query / SWR mutationFns
await updateOrder({ orderId: 'ord_01khr…', body: { ...orderBody } });
```

## Error handling

By default (`--error-mode throw`) an operation throws `ApiError` on any non-2xx response and returns the success body directly. With `--error-mode result` it never throws for HTTP errors, returning a discriminated `Result<TData, TError>` whose `error` is typed from the spec's 4xx/5xx bodies:

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

Transport and abort failures still throw in both modes. The choice is fixed at generate time.

## Middleware

Beyond the single `onRequest`/`onResponse`/`onError` hooks on `ClientConfig`, the client takes **composable middleware** for cross-cutting concerns (auth refresh, logging, tracing, request IDs). Register with `use()` (functions facade) or `<Client>.use()` (service-class); both accept several at once:

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

`onRequest` runs in registration order; `onResponse` runs in reverse (onion). `onRequest` may mutate `ctx` (`url`/`method`/`headers`/`body` — body edits are serialized and sent); `onResponse` may return a replacement `Response`. `onError` (throw mode only) is threaded through each middleware. `ctx.operation`'s fields are typed literal unions (`OperationId`/`OperationPath`/`OperationTag`) for autocomplete and typo-checking. A single call's header instead goes in that operation's trailing `init` argument.

See the [`customization` example](https://github.com/Redocly/redocly-cli/tree/main/tests/e2e/generate-client/examples/customization) for a runnable version.

## Publisher defaults

The middleware above is composed by the **consumer**. If you **publish an SDK**, bake defaults in at generation time with `--setup <file>`. The setup module imports its contract from `@redocly/client-generator` (so it resolves and is unit-testable) and default-exports `defineClientSetup({ config, middleware })`:

```ts
// client-setup.ts
import { defineClientSetup, type RequestContext } from '@redocly/client-generator';

export default defineClientSetup({
  config: { baseUrl: 'https://api.acme.com', retry: { retries: 3 } },
  middleware: [{ onRequest: (ctx: RequestContext) => { ctx.headers['X-Acme-SDK'] = '1.4.0'; } }],
});
```

```sh
redocly generate-client openapi.yaml --output src/api/client.ts --setup ./client-setup.ts
```

The baked block runs before the consumer's own setup. **Config values** are last-write-wins (a consumer overrides a baked default), while **middleware composes** (baked first, then the consumer's). Express un-bypassable behavior as middleware, not a baked `fetch`. A setup file may import **only** from `@redocly/client-generator`. See the [`baked-setup` example](https://github.com/Redocly/redocly-cli/tree/main/tests/e2e/generate-client/examples/baked-setup).

## Retries

Retry is **opt-in**, configured through `ClientConfig` with an optional per-call override:

```ts
configure({ retry: { retries: 3 } });                          // global (functions facade)
const client = new Client({ retry: { retries: 3 } });          // per instance (service-class)
await getOrderById('ord_123', {}, { retry: { retries: 5 } });  // per call
```

By default only **idempotent** methods (`GET`, `HEAD`, `PUT`, `DELETE`, `OPTIONS`) are retried, on a network error or a transient status (`408`, `429`, `500`, `502`, `503`, `504`). `POST`/`PATCH` are not, since re-sending can duplicate side effects — opt in with a custom `retryOn` when safe. Backoff is exponential with full jitter (`retryStrategy: 'fixed'` for a constant delay); a `Retry-After` header takes precedence; an aborted `AbortSignal` stops retries immediately.

| `RetryConfig` field | Type | Default |
| --- | --- | --- |
| `retries` | `number` | `0` (extra attempts after the first; `0` disables) |
| `retryDelay` | `number` | `1000` (base delay, ms) |
| `retryStrategy` | `'fixed' \| 'exponential'` | `'exponential'` |
| `jitter` | `boolean` | `true` |
| `retryOn` | `(ctx: RetryContext) => boolean \| Promise<boolean>` | idempotent-only predicate |

A custom `retryOn` receives the failed attempt's `RetryContext` (`attempt`, `request`, and exactly one of `response` / `error`) and **fully replaces** the default. To inspect a response body, read `ctx.response.clone()` — the body is a single-use stream:

```ts
await createOrder(body, {
  retry: {
    retries: 3,
    retryOn: async (ctx) => {
      if (ctx.error) return true;                 // transport error
      return (ctx.response?.status ?? 0) >= 500;  // server error
    },
  },
});
```

## Query serialization

Query parameters follow their OpenAPI `style` / `explode` / `allowReserved`. The default (`form`, `explode: true`) repeats array values:

| `style` | `explode` | `['a', 'b']` on the wire |
| --- | --- | --- |
| `form` (default) | `true` | `key=a&key=b` |
| `form` | `false` | `key=a,b` |
| `spaceDelimited` | `false` | `key=a%20b` |
| `pipeDelimited` | `false` | `key=a\|b` |

Delimiters are literal (values are still percent-encoded). `allowReserved: true` leaves the RFC-3986 reserved set un-encoded. Object-valued params serialize as `deepObject` brackets (`key[sub]=val`).

## Multipart uploads

A `multipart/form-data` body whose schema is an **object** is generated as a typed object; pass a plain object and the client serializes it to `FormData` (after the `onRequest` chain, so middleware can mutate it). Binary fields (`format: binary`) are typed as `Blob`:

```ts
// type UploadBody = { file: Blob; orgId: string; tags?: string[] };
await upload({ file, orgId: 'org_1', tags: ['a', 'b'] });
```

`Blob`/strings pass through, arrays append one field per item, nested objects are JSON-encoded, `undefined`/`null` are skipped. A multipart body whose schema isn't a concrete object keeps the raw `FormData` type. `format: byte` (base64) stays a `string`.

## Response decoding

The client reads each response by negotiating from its `Content-Type` (JSON, then `text/*`, then `Blob`). Force a reader per call with `parseAs`:

```ts
const res = await getMenuItemPhoto('prd_123', { parseAs: 'stream' });
```

`parseAs` accepts `'json'`, `'text'`, `'blob'`, `'arrayBuffer'`, `'formData'`, `'stream'`, or `'auto'` (default). It changes the runtime reader only, not the static return type.

## Operation metadata

The client exports an `OPERATIONS` map keyed by operationId, holding each operation's `method`, `path` template, and `tags`:

```ts
export const OPERATIONS = {
  getOrderById: { method: 'GET', path: '/orders/{orderId}', tags: ['Orders'] },
  // …
} as const;
```

Because keys and values are plain string literals, they survive bundling/minification — making `OPERATIONS` the stable handle for cache keys, span names, or log labels (rather than `fn.name`, which a minifier can rename). The same `OperationId` / `OperationPath` / `OperationTag` unions type `ctx.operation` in middleware.

## Discriminated unions

A `oneOf` / `anyOf` with a usable discriminator gets an exported `is<Member>` type guard per member, taken from the spec's `discriminator` or inferred when every member pins a shared property to a distinct string `const`:

```ts
export type MenuItem = Beverage | Dessert;
export function isBeverage(value: MenuItem): value is Beverage { … }
```

Guards are also emitted for unions nested inside another schema (array items, property values) as long as every member is a named schema. A union without a usable discriminator gets no guard.

## Server-Sent Events

An operation whose `2xx` response declares `text/event-stream` is generated as a typed async iterator under an `sse` namespace — no flag required. Each event's `data` is typed from the OpenAPI 3.2 `itemSchema` (falling back to the media `schema`, then `string`) and `JSON.parse`d when structured:

```ts
import { sse } from './client.ts';

for await (const ev of sse.streamMessages()) {
  console.log(ev.id, ev.data.text); // ServerSentEvent<T>: { event?, data, id?, retry? }
}
```

The stream **auto-reconnects** on a dropped connection, resuming from the last event id via `Last-Event-ID` (backoff honors the server's `retry:`, then `reconnectDelay`, then 1s; capped at 30s). Tune per call with `{ reconnect: false }` or `{ reconnectDelay: 500 }`. `break`ing the loop or aborting an `AbortSignal` ends it cleanly (no throw). SSE always throws `ApiError` on a non-2xx initial response, regardless of `--error-mode`.

## Custom generators

The built-in generators cover common targets. For anything else derived from the same description (validators in another library, a permissions map, a house-style SDK), write a **custom generator**: it reads the same spec-agnostic model the built-ins consume, so its output never drifts from the spec.

A generator is `{ name, run }` (plus optional compatibility metadata); author it with `defineGenerator`:

```ts
// route-map-generator.ts
import { defineGenerator } from '@redocly/client-generator/plugin';

export default defineGenerator({
  name: 'route-map',
  requires: ['sdk'],
  run({ model, outputPath }) {
    const routes = model.services
      .flatMap((s) => s.operations)
      .map((op) => `  ${op.name}: '${op.method.toUpperCase()} ${op.path}',`)
      .join('\n');
    return [{ path: outputPath.replace(/\.ts$/, '.routes.ts'), content: `export const routes = {\n${routes}\n} as const;\n` }];
  },
});
```

The `@redocly/client-generator/plugin` entry also exports the codegen toolkit (`ts`, `printStatements`, `parseStatements`, `operationSignature`, `schemaToTypeNode`, `pascalCase`, …) and the IR types, so a custom generator emits TypeScript exactly as the first-party ones do.

Select it in `redocly.yaml` by path or package name:

```yaml
x-client-generator:
  generators:
    - sdk
    - ./tools/route-map-generator.ts   # local path (resolved against redocly.yaml)
    - '@acme/openapi-valibot'          # published package
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

Import-specifier generators execute at generation time — they carry the same trust level as any installed dependency you run. See the [`custom-generator` example](https://github.com/Redocly/redocly-cli/tree/main/tests/e2e/generate-client/examples/custom-generator).

## Resources

- [Lint command](./lint.md) to validate your API description before generating a client.
- [Bundle command](./bundle.md) to combine a multi-file description into a single input file.
- [Configuration](../configuration/index.md) reference for `redocly.yaml`, including the `apis:` aliases you can pass as `<api>`.
