---
slug:
  - /docs/cli/commands/generate-client
---

# `generate-client`

{% admonition type="warning" name="Experimental" %}
`generate-client` is **experimental**.
Its CLI flags, generated output, configuration schema, and the custom-generator plugin API may change in any minor release until the feature is declared stable.
Pin your `@redocly/cli` version if you depend on the generated output, and plan to regenerate when you upgrade.
We'd love your feedback while we stabilize it.
{% /admonition %}

Generate a typed TypeScript client from an OpenAPI description.

Accepts **OpenAPI 3.x**, plus **Swagger 2.0** (normalized to the 3.x shape before generation).
`<input>` is a file path, a URL, or an `apis:` alias from `redocly.yaml`.

The generated client has **zero runtime dependencies** — it uses only web-standard APIs (`fetch`, `AbortController`, `URLSearchParams`, …), so it runs in browsers, Node, Bun, Deno, and edge runtimes.
Code is produced through the TypeScript compiler AST (not string templates), so output is correct by construction.
By default it emits a single file containing inline types and one async function per operation.

## Usage

```sh
npx @redocly/cli@latest generate-client <input> --output <file.ts>

# <input> is an OpenAPI description file path or an `apis:` alias from redocly.yaml
redocly generate-client openapi.yaml --output src/client.ts
redocly generate-client cafe -o src/client.ts
```

## Options

{% table %}

- Option {% width="20%" %}
- Type {% width="15%" %}
- Description

---

- `input`
- `string`
- **REQUIRED.**
  Positional argument: OpenAPI description file path, or an alias from the `apis:` section of `redocly.yaml`.

---

- `--output`, `-o`
- `string`
- **REQUIRED.**
  Output path for the generated client. Must end in `.ts`.
  In multi-file modes it is the entry file; sibling files derive from its name and directory.

---

- `--output-mode`
- `string`
- File layout: `single` (default, one file), `split` (endpoints, schemas, and runtime in sibling files), `tags` (one endpoints file per OpenAPI tag), or `tags-split` (a folder per tag).
  All multi-file modes share the schemas and runtime modules.

---

- `--generators`
- `string`
- Comma-separated generators to run (default `sdk`).
  `sdk` is the typed client.
  `zod` additionally emits a standalone `<output>.zod.ts` module of [Zod](https://zod.dev) schemas.
  `tanstack-query` additionally emits a `<output>.tanstack.ts` module of [TanStack Query](https://tanstack.com/query) v5 factories wrapping the sdk (framework selected by `--query-framework`).
  `swr` additionally emits a `<output>.swr.ts` module of [SWR](https://swr.vercel.app) hooks.
  `mock` additionally emits a `<output>.mocks.ts` module of [MSW](https://mswjs.io) request handlers (data controlled by `--mock-data`).
  `transformers` additionally emits a `<output>.transformers.ts` module of `transform<Name>` functions that convert wire ISO strings to `Date` (pair with `--date-type Date`). Example: `--generators sdk,zod` or `--generators sdk,tanstack-query,mock`.

---

- `--query-framework`
- `string`
- TanStack Query adapter the `tanstack-query` generator imports from: `react` (default), `vue`, `svelte`, or `solid`.
  Only the import specifier changes — the emitted factory module is byte-identical across frameworks.

---

- `--mock-data`
- `string`
- How the `mock` generator produces data: `baked` (default) inlines deterministic literals (zero runtime dependency).
  `faker` emits `@faker-js/faker` calls for realistic data (install `@faker-js/faker` as a dev dependency).

---

- `--mock-seed`
- `number`
- Seed for faker-mode mocks: emits a top-level `faker.seed(<n>)` so generated data is reproducible across runs.
  Ignored in `baked` mode.

---

- `--date-type`
- `string`
- How `date-time`/`date` string fields are typed: `string` (default) keeps the ISO wire shape, byte-identical to before.
  `Date` emits a `Date` instead.
  Pair `--date-type Date` with `--generators sdk,transformers` so the runtime value (parsed by `transform<Name>`) matches the type.
  `int64` → `bigint` is deferred to a follow-up.

---

- `--facade`
- `string`
- Developer-facing operation shape: `functions` (default, standalone async functions) or `service-class` (operations grouped as class methods — one `Client` class in `single`/`split`, one service class per tag in `tags`/`tags-split`).

---

- `--name`
- `string`
- Class name for the `service-class` facade in `single`/`split` layouts (ignored otherwise). Defaults to `Client`.

---

- `--args-style`
- `string`
- How operation inputs are passed: `flat` (default) spreads path params as positional arguments followed by `params`/`body`/`headers`; `grouped` bundles every input into a single `vars` object (typed as the operation's `<Op>Variables`).
  The per-call request `init` stays a separate trailing argument in both styles.

---

- `--enum-style`
- `string`
- How named string enums are emitted: `const-object` (default) emits a runtime `as const` object alongside the union type; `union` emits only the union type.

---

- `--error-mode`
- `string`
- Error-handling shape: `throw` (default) throws `ApiError` on a non-2xx response.
  `result` returns a discriminated `{ data, error, response }` object instead, with `error` typed from the spec's 4xx/5xx response bodies.

---

- `--base-url`
- `string`
- Override the `BASE` URL inlined into the generated runtime.
  Defaults to `servers[0].url` from the description. Must be a valid URL.

---

- `--config`
- `string`
- Path to the `redocly.yaml` configuration file (where the `x-openapi-typescript` block lives).
  Defaults to the `redocly.yaml` discovered in the working directory.

{% /table %}

## Configuration

Instead of passing flags every time, you can put the settings in your `redocly.yaml` under an `x-openapi-typescript` block.
`generate-client` reads it automatically — from a `redocly.yaml` in the working directory, or one pointed to by the standard `--config` flag:

```yaml
# redocly.yaml
x-openapi-typescript:
  input: ./openapi.yaml
  output: ./src/api/client.ts
  generators:
    - sdk
  facade: service-class
```

Then run:

```sh
redocly generate-client
```

Relative `input`/`output` are resolved against the `redocly.yaml` directory, so the command works the same from any working directory.
Point at a `redocly.yaml` elsewhere with the standard `--config` flag:

```sh
redocly generate-client --config ./config/redocly.yaml
```

**Precedence** (lowest to highest): the `redocly.yaml` `x-openapi-typescript` block → individual CLI flags.
Each layer overrides per setting, so you can keep a base config and override one value on the command line.
For code-level control — including registering custom generators inline — use the programmatic API instead (see [Custom generators](#custom-generators)).

## Examples

Generate a single-file client (the default):

```sh
redocly generate-client openapi.yaml --output src/client.ts
```

Split the output across files, one endpoints file per tag:

```sh
redocly generate-client openapi.yaml --output src/client.ts --output-mode tags
```

Emit a class-based client and override the base URL for a staging environment:

```sh
redocly generate-client openapi.yaml \
  --output src/client.ts \
  --facade service-class \
  --name CafeClient \
  --base-url https://staging.cafe.cloud.redocly.com
```

Once generated, import and call operations directly:

```ts
import { configure, listMenuItems, getOrderById, setBearer } from './client.ts';

setBearer(token); // auth helpers are generated from the spec's securitySchemes

const menu = await listMenuItems({ limit: 10 });
const order = await getOrderById('ord_01khr487f7qm7p44xn427m43vb');
```

## Authentication

A setter is generated for each `securityScheme` the runtime can apply, and each operation automatically sends the credentials its `security` requires:

| Scheme                 | Generated setter                          | Applied as                      |
| ---------------------- | ----------------------------------------- | ------------------------------- |
| HTTP `bearer` / OAuth2 | `setBearer(token)`                        | `Authorization: Bearer <token>` |
| HTTP `basic`           | `setBasicAuth(username, password)`        | `Authorization: Basic <base64>` |
| `apiKey` in header     | `setApiKey(key)` / `setApiKey<Name>(key)` | the named request header        |
| `apiKey` in query      | `setApiKey(key)` / `setApiKey<Name>(key)` | the named URL query parameter   |
| `apiKey` in cookie     | `setApiKey(key)` / `setApiKey<Name>(key)` | folded into the `Cookie` header |

`setApiKey` is unsuffixed when the spec declares a single apiKey scheme.
Otherwise, each gets a `setApiKey<SchemeName>` setter.
`mutualTLS` is not injectable.

Bearer and apiKey credentials accept a **`TokenProvider`** — a string, or a (possibly async) function called per request, which is handy for refresh-token flows:

```ts
import { setBearer, setBasicAuth, setApiKey } from './client.ts';

setBearer('static-token'); // a literal value
setBearer(async () => await getFreshAccessToken()); // resolved before each authed call
setBasicAuth('alice', 's3cr3t'); // encoded as `Authorization: Basic <base64>`
setApiKey('my-api-key'); // header / query / cookie, per the scheme's `in`
```

### Per-instance credentials (service-class facade)

The setters above are **module-global** — every call shares them.
When you run multiple independent clients (the reason to choose `--facade service-class`), give each instance its own credentials via `ClientConfig.auth`.
It overrides the global setters for that instance and still honors each operation's declared `security`; omitted fields fall back to the global slots.

```ts
import { Client } from './client.ts';

// Two instances of the same client, different credentials — no shared global state.
const internal = new Client({ auth: { basic: { username: 'svc', password: 's3cr3t' } } });
const publicApi = new Client(); // no auth

// `auth` mirrors the schemes the spec declares:
//   { bearer?: TokenProvider; basic?: { username; password }; apiKey?: Record<string, TokenProvider> }
const withToken = new Client({ auth: { bearer: async () => getAccessToken() } });
```

The functions facade can set the same field once globally via `configure({ auth: … })`.

## Argument style

By default each operation takes **positional arguments** — path params in URL order, then `params` (query), `body`, and `headers` slots, with the per-call request `init` last:

```ts
// --args-style flat (default)
const order = await updateOrder(
  'ord_01khr487f7qm7p44xn427m43vb', // orderId path param
  { ...orderBody } // request body
);
```

With `--args-style grouped`, every input is bundled into a single `vars` object typed as the operation's exported `<Op>Variables` type.
The `init` argument stays separate:

```ts
// --args-style grouped
const order = await updateOrder({
  orderId: 'ord_01khr487f7qm7p44xn427m43vb',
  body: { ...orderBody },
});
```

The grouped style is order-independent and additive — new path or query params show up as new keys rather than shifting positions.
This strategy makes it a good fit as specs evolve and for wiring operations into React Query / SWR `mutationFn`s.
Operations with no inputs take no `vars` object at all (just the optional `init`).

```sh
redocly generate-client openapi.yaml --output src/client.ts --args-style grouped
```

## Query serialization

Query parameters are serialized per their OpenAPI `style` / `explode` / `allowReserved` declarations.
The default — `style: form` with `explode: true` — repeats array values (`tags=a&tags=b`) and is what you get when you declare nothing.
The other supported forms:

| `style`          | `explode` | Array `['a', 'b']` on the wire |
| ---------------- | --------- | ------------------------------ |
| `form` (default) | `true`    | `key=a&key=b`                  |
| `form`           | `false`   | `key=a,b`                      |
| `spaceDelimited` | `false`   | `key=a%20b`                    |
| `pipeDelimited`  | `false`   | `key=a\|b`                     |

Delimiters are emitted literally (the individual values are still percent-encoded).
`allowReserved: true` leaves the RFC-3986 reserved set (`:/?#[]@!$&'()*+,;=`) un-encoded in a value, so e.g. `filter=a/b` survives instead of `filter=a%2Fb`.
Declare these on the parameter object in the spec:

```yaml
- name: tags
  in: query
  style: pipeDelimited
  explode: false
  schema:
    type: array
    items:
      type: string
```

Object-valued query params serialize as `deepObject` brackets (`key[sub]=val`).

{% admonition type="info" name="Note" %}
An object param at the default `form` style is also emitted as `key[sub]=val` brackets rather than the spec's `sub=val` spread.
{% /admonition %}

## Error handling

By default (`--error-mode throw`) an operation throws an `ApiError` on any non-2xx response, so a call returns the success body directly:

```ts
try {
  const order = await getOrderById('ord_01khr487f7qm7p44xn427m43vb');
} catch (err) {
  if (err instanceof ApiError) console.error(err.status, err.body);
}
```

With `--error-mode result`, an operation never throws on a non-2xx response.
Instead it returns a discriminated `Result<TData, TError>` — `{ data, error, response }` — whose `error` is typed from the spec's declared 4xx/5xx response bodies (the `<Op>Error` union).
On success `error` is `undefined`; on a non-2xx response `data` is `undefined` and `error` holds the typed body.
`response` is always the raw `Response`, so the HTTP status is `response.status`:

```ts
// --error-mode result
const { data, error, response } = await getThing('thing_123');
if (error) {
  // `error` is typed (e.g. ProblemDetails); narrow on the status if needed.
  console.error(response.status, error.title);
} else {
  console.log(data.id); // `data` is the success body
}
```

Transport-level and abort failures still throw in both modes; the `onError` hook applies to `throw` mode only.
The choice is made once at generate time for the whole client.

```sh
redocly generate-client openapi.yaml --output src/client.ts --error-mode result
```

## Operation metadata

Alongside the operations, the client exports an `OPERATIONS` map keyed by operationId, holding each operation's HTTP method and path template (with `{param}` placeholders intact):

```ts
export const OPERATIONS = {
  listMenuItems: { method: 'GET', path: '/menu' },
  getOrderById: { method: 'GET', path: '/orders/{orderId}' },
  // …
} as const;

export type OperationId = keyof typeof OPERATIONS;
export type OperationMetadata = { readonly method: string; readonly path: string };
```

Because the keys and values are plain string literals — not function or method names — they survive bundling and minification.
That makes `OPERATIONS` the stable handle to reach for when building cache/query keys, tracing span names, or request log labels, instead of reflecting over a function (`fn.name` / `fn.toString()`), which a minifier can rename:

```ts
import { OPERATIONS, getOrderById } from './client.ts';

// Stable React Query key, robust under minification.
const queryKey = [OPERATIONS.getOrderById.path, orderId];
const order = await getOrderById(orderId);
```

The map is emitted for both facades (`functions` and `service-class`) and, in the multi-file output modes, lives once in the shared schemas module and is re-exported from the entry barrel.

## Discriminated unions

A `oneOf` / `anyOf` with a usable discriminator gets an exported `is<Member>` type guard per member, narrowing the union to that member's named type.
The discriminator is taken from the spec's `discriminator` block, or inferred when every member is a named schema that pins one shared property to a distinct string `const`.

```ts
export type MenuItem = Beverage | Dessert;

export function isBeverage(value: MenuItem): value is Beverage { … }
export function isDessert(value: MenuItem): value is Dessert { … }
```

Guards are also emitted when the union is **nested** inside another schema — e.g. the `items` of an array, or a property value — as long as every member is a named schema.
The guard's parameter is then the inline member union:

```ts
// `BulkResult = (BulkSuccessItem | BulkErrorItem)[]` — a discriminated array.
export function isBulkSuccessItem(
  value: BulkSuccessItem | BulkErrorItem
): value is BulkSuccessItem { … }

// Narrow each item without hand-writing the discriminant check:
const created = result.flatMap((item) => (isBulkSuccessItem(item) ? [item.resource] : []));
```

{% admonition type="info" name="Note" %}
Each `is<Member>` is emitted once, even when the same member appears in several unions (the first occurrence in document order wins).
A union without a usable discriminator gets no guard — TypeScript can't soundly narrow it.
{% /admonition %}

## Middleware

Beyond the single `onRequest` / `onResponse` / `onError` hooks on `ClientConfig`, the client takes **composable middleware** — the escape hatch for cross-cutting concerns like auth-token refresh, logging, tracing, or request IDs.
A middleware is an object with any subset of the three hooks:

```ts
type Middleware = {
  onRequest?: (ctx: RequestContext) => void | Promise<void>;
  onResponse?: (
    response: Response,
    ctx: RequestContext
  ) => Response | void | Promise<Response | void>;
  onError?: (error: ApiError, ctx: RequestContext) => Error | Promise<Error>; // throw mode
};
```

Register with `use()` (functions facade) or `<Client>.use()` (service-class facade); both accept several at once and can be called repeatedly:

```ts
// functions facade
import { use, configure } from './client.ts';
use(
  {
    onRequest: (ctx) => {
      ctx.headers['X-Request-Id'] = crypto.randomUUID();
    },
  },
  {
    onResponse: (res) => {
      console.debug(res.status);
    },
  }
);

// service-class facade
const client = new Client({ middleware: [authRefresh] }); // declaratively…
client.use(logging); // …or imperatively (chainable)
```

`onRequest` runs in registration order; `onResponse` runs in **reverse** — an onion, so the last-registered middleware wraps closest to the network.
`onError` (throw mode only) is threaded through each middleware in turn, so any can map the failure.
`onRequest` may mutate the request context (`url` / `method` / `headers`); `onResponse` may return a replacement `Response`.

`onRequest` and `onResponse` run for every request — under both `throw` and `result` error modes, and around each Server-Sent-Events connect/reconnect.
`onError` only fires when a non-2xx response would be **thrown**, so it is a no-op in `result` mode (inspect `result.error` instead) and for SSE (which throws its own `ApiError`).
Transport/network failures are not routed through `onError`.

{% admonition type="info" name="Relation to the single hooks" %}
The `onRequest` / `onResponse` / `onError` fields on `ClientConfig` still work — they run as one implicit, first middleware.
`use()` simply appends to the same chain (`ClientConfig.middleware`), so existing code is unaffected.
{% /admonition %}

## Retries

The generated client can retry transient failures.
Retry is **opt-in** and configured through `ClientConfig`, with an optional per-call override.

```ts
// Global policy (functions facade)
configure({ retry: { retries: 3 } });

// Per instance (service-class facade)
const client = new Client({ retry: { retries: 3 } });

// Per call — opt in where there is no global policy
await getOrderById('ord_01khr487f7qm7p44xn427m43vb', {}, { retry: { retries: 5 } });

// Per call — opt out where a global policy is set
await listMenuItems({ limit: 10 }, { retry: { retries: 0 } });
```

By default only **idempotent** methods (`GET`, `HEAD`, `PUT`, `DELETE`, `OPTIONS`) are retried, on a network error or a transient status (`408`, `429`, `500`, `502`, `503`, `504`).
`POST`/`PATCH` are **not** retried automatically, because re-sending a non-idempotent request can duplicate side effects.
Opt in explicitly when your API is safe (e.g. it uses idempotency keys):

```ts
await createOrder(body, { retry: { retries: 3, retryOn: () => true } });
```

Backoff is exponential with full jitter (`retryStrategy: 'fixed'` for a constant delay).
A `Retry-After` response header takes precedence over the computed delay.
Retries stop immediately when the request's `AbortSignal` aborts.

### `RetryConfig` fields

{% table %}

- Field {% width="20%" %}
- Type {% width="25%" %}
- Description

---

- `retries`
- `number`
- Number of _extra_ attempts after the first. Default `0` (opt-in; `0` disables retry).

---

- `retryDelay`
- `number`
- Base delay in milliseconds. Default `1000`.

---

- `retryStrategy`
- `'fixed' | 'exponential'`
- Backoff shape. Default `'exponential'`.

---

- `jitter`
- `boolean`
- Apply full jitter over the computed delay. Default `true`.

---

- `retryOn`
- `(ctx: RetryContext) => boolean | Promise<boolean>`
- Decide whether to retry a failed attempt. Defaults to the idempotent-only predicate described above.

{% /table %}

A per-call override is merged field-by-field over the global policy.
A single field (such as `retries: 0`) can disable retry for one call without restating the whole policy.

### Custom `retryOn`

`retryOn` receives a `RetryContext` for the attempt that just failed and returns whether to retry.
A custom predicate **fully replaces** the idempotent-only default.
This way you opt a `POST`/`PATCH` into retrying (the method is no longer checked for you).

{% table %}

- Field {% width="20%" %}
- Type {% width="25%" %}
- Description

---

- `attempt`
- `number`
- 1-based number of the attempt that just failed.

---

- `request`
- `RequestContext`
- The attempted request: `{ url, method, headers, body }`.

---

- `response`
- `Response | undefined`
- Present when the server returned a (non-ok) response.
  Absent on a transport error.

---

- `error`
- `unknown`
- Present when the transport threw (network error, DNS, connection reset).
  Absent on an HTTP response.

{% /table %}

Exactly one of `response` / `error` is set: branch on `ctx.error` for transport failures and `ctx.response` for HTTP status codes.
To inspect the **response body**, clone it first — the body is a single-use stream, and reading it directly would leave nothing for the client to parse:

```ts
await pushRemoteContent(
  { orgId, projectId, body: formData },
  {
    retry: {
      retries: 5,
      retryDelay: 1000,
      retryStrategy: 'exponential',
      retryOn: async (ctx) => {
        if (ctx.error) return true; // network / connection error — retry
        const res = ctx.response;
        if (!res) return false;
        if (res.status >= 500) return true;
        // Body inspection: clone() so the original stream stays readable downstream.
        const body = await res
          .clone()
          .json()
          .catch(() => undefined);
        return body?.title === 'Multipart: Unexpected end of form';
      },
    },
  }
);
```

{% admonition type="warning" name="Read the body via clone()" %}
`ctx.response` is the raw `Response` — its body can be read only once.
Always inspect it through `ctx.response.clone()`.
Calling `.json()`/`.text()` on `ctx.response` directly consumes the stream and the client can no longer decode the result.
{% /admonition %}

## Multipart uploads

A `multipart/form-data` request body whose schema is an **object** is generated as a typed object.
When you pass a plain object, the client serializes it to `FormData` for you.
Binary fields (`type: string, format: binary`) are typed as `Blob` (a `File` is assignable):

```ts
// type UploadBody = { file: Blob; orgId: string; tags?: string[] };
await upload({ file, orgId: 'org_1', tags: ['a', 'b'] });
```

Serialization rules:

- `Blob`/`File` and strings pass through
- arrays append one field per item
- nested objects are JSON-encoded
- other scalars are stringified
- `undefined`/`null` are skipped

A multipart body whose schema **isn't** a concrete object keeps the raw `FormData` type.
You can build the form yourself when the shape can't be expressed.

`format: binary` surfaces as `Blob` wherever it appears; `format: byte` (base64) stays a `string`.

## Response decoding

By default the client reads each response body by negotiating from its `Content-Type` (JSON, then `text/*`, then `Blob`).
The per-call request `init` accepts a `parseAs` option to force a specific reader:

```ts
// Read the raw bytes as a stream instead of decoding JSON.
const res = await getMenuItemPhoto('prd_01khr487f7qm7p44xn427m43vb', { parseAs: 'stream' });
for await (const chunk of res as ReadableStream<Uint8Array>) {
  // …consume the stream…
}
```

`parseAs` accepts `'json'`, `'text'`, `'blob'`, `'arrayBuffer'`, `'formData'`, `'stream'` (the raw `ReadableStream` from `response.body`), or `'auto'` (the default content-type sniff).

{% admonition type="warning" name="Runtime override only" %}
`parseAs` does not change the operation's static return type.
Forcing a reader that disagrees with the schema (for example `'blob'` on a JSON endpoint) returns that value at runtime while TypeScript still reports the declared type.
Reconciling the two is the caller's responsibility.
{% /admonition %}

## Runtime validation with Zod

Pass `--generators sdk,zod` to additionally emit a standalone `<output>.zod.ts` module of [Zod](https://zod.dev) schemas — one `export const <Name>Schema` per schema in the description:

```sh
redocly generate-client openapi.yaml --output src/client.ts --generators sdk,zod
# → src/client.ts (the zero-dependency client) + src/client.zod.ts (the Zod schemas)
```

The generated **client stays dependency-free** and never imports Zod.
The `*.zod.ts` module is the only file that imports Zod, so install it in your app as a peer:

```sh
npm install zod   # any zod ^3.23 || ^4
```

Validate a payload with `.parse()` (or `.safeParse()`), and derive the static type from the same schema with `z.infer` — it matches the client's exported type:

```ts
import { z } from 'zod';
import type { Pet } from './client.ts';
import { PetSchema } from './client.zod.ts';

const pet = PetSchema.parse(await res.json()); // throws on invalid input
type PetFromSchema = z.infer<typeof PetSchema>; // structurally equal to `Pet`
const typed: Pet = pet;
```

Each schema maps the OpenAPI structure plus the validation refinements that are stable across Zod 3.23 and 4 — string/array length (`.min`/`.max`), numeric bounds (`.min`/`.max`/`.gt`/`.lt`), `.int`, and `.regex`.
Refs become `z.lazy(() => …)`, so recursive and forward-referencing schemas validate correctly.
Format-specific helpers (`.email`/`.uuid`/`.url`) are intentionally not emitted, since they diverge between Zod 3 and 4.

## TanStack Query

Pass `--generators sdk,tanstack-query` to additionally emit a standalone `<output>.tanstack.ts` module of [TanStack Query](https://tanstack.com/query) v5 factories that wrap the sdk operations:

```sh
redocly generate-client openapi.yaml --output src/client.ts --generators sdk,tanstack-query
# → src/client.ts (the zero-dependency client) + src/client.tanstack.ts (the TanStack Query factories)

# Vue / Svelte / Solid: only the import specifier changes
redocly generate-client openapi.yaml --output src/client.ts \
  --generators sdk,tanstack-query --query-framework vue
```

Per **query** operation (`GET`/`HEAD`) the module exports a `<op>QueryKey(vars)` and a `<op>Options(vars, init?)` factory that returns `queryOptions({ queryKey, queryFn })`.
Per **mutation** (every other method), it exports a `<op>Mutation()` factory returning `{ mutationKey, mutationFn }`.
Each factory forwards to the matching sdk function, so the generated client itself stays dependency-free.

Compose them with `useQuery`/`useMutation`:

```ts
import { useQuery, useMutation } from '@tanstack/react-query';
import { getPetOptions, createPetMutation } from './client.tanstack.ts';

function Pet({ id }: { id: string }) {
  const { data } = useQuery(getPetOptions({ id }));
  const { mutate } = useMutation(createPetMutation());
  // …
}
```

The `*.tanstack.ts` module is the only file that imports TanStack Query, so install the adapter for your framework as a peer — any `@tanstack/<framework>-query` `^5`:

```sh
npm install @tanstack/react-query   # ^5  (or @tanstack/vue-query, /svelte-query, /solid-query)
```

Select the framework with `--query-framework` (`react` default, `vue`, `svelte`, `solid`).
Only the import specifier the module reads from changes — the emitted factory module is otherwise **byte-identical** across frameworks, since TanStack Query's `queryOptions`/mutation shapes are framework-agnostic.

The factories wrap the **throw-mode** sdk (the default): TanStack's `queryFn` is expected to throw on error.
Use the default (throw-mode) client — a `--error-mode result` client would need an unwrap-and-throw shim, which is out of scope.

{% admonition type="info" name="Compatibility" %}
`tanstack-query` wraps the sdk's exported throw-mode functions, so it requires `--generators sdk`, `--facade functions`, and `--error-mode throw`.
An incompatible selection fails fast with an explanatory message rather than emitting a client that doesn't compile.

Server-Sent-Events operations have no request/response function to wrap: you consume them via the sdk's `sse.*` surface.
These operations they are **skipped** with a notice, and the rest of the operations are still generated.
{% /admonition %}

## SWR

Pass `--generators sdk,swr` to additionally emit a standalone `<output>.swr.ts` module of [SWR](https://swr.vercel.app) hooks that wrap the sdk operations:

```sh
redocly generate-client openapi.yaml --output src/client.ts --generators sdk,swr
# → src/client.ts (the zero-dependency client) + src/client.swr.ts (the SWR hooks)
```

Each **query** operation (`GET`/`HEAD`) exports a `<op>Key(vars)` tuple factory and a `use<Op>(vars, init?)` hook returning `useSWR(key, fetcher)`.
Each **mutation** exports a `use<Op>()` hook returning `useSWRMutation(key, trigger)`.
Call them straight from a component:

```ts
import { useGetPetById, useCreatePet } from './client.swr.ts';

const { data } = useGetPetById({ id });
const { trigger } = useCreatePet();
await trigger({ body: { name: 'Rex' } });
```

The generated client stays dependency-free.
Only the `*.swr.ts` module imports SWR (`swr` for queries, `swr/mutation` for mutations).
Install it in your app as a peer — any `swr` `^2`:

```sh
npm install swr   # ^2
```

{% admonition type="info" name="Compatibility" %}
The hooks wrap the **throw-mode** sdk (the default), since SWR's fetcher is expected to throw an error.
`swr` requires `--generators sdk`, `--facade functions`, and `--error-mode throw`.
An incompatible selection fails fast.
SSE operations are **skipped** with a notice (consume them via the sdk's `sse.*` surface).
{% /admonition %}

## Date transformers

By default, `date-time`/`date` fields are typed as `string` (the ISO wire shape).
Pass `--date-type Date` to type them as `Date` instead, and pair it with `--generators sdk,transformers` to emit a standalone `<output>.transformers.ts` module of `transform<Name>(data)` functions that convert those wire ISO strings to `Date` at runtime so the value matches the type:

```sh
redocly generate-client openapi.yaml --output src/client.ts \
  --generators sdk,transformers --date-type Date
# → src/client.ts (the zero-dependency client, dates typed `Date`) + src/client.transformers.ts
```

Per schema that (recursively) carries a date field, the module exports a `transform<Name>(data: <Name>): <Name>` that walks the value and rewrites the date positions in place — top-level scalars, arrays of dates, records, and `$ref`s (composing `transformPet` → `transformOwner`).
Pipe responses through it:

```ts
import { getPet } from './client.ts';
import { transformPet } from './client.transformers.ts';

const pet = transformPet(await getPet(id));
// pet.createdAt is now a Date
```

The transformers module imports only the schema **types** from the client, so the generated client itself stays dependency-free (`Date` is a web standard — no library).
`int64` → `bigint` is deferred to a follow-up; without `--date-type Date` the date fields stay `string` and the output is byte-identical to before.

{% admonition type="info" name="Compatibility" %}
`transformers` requires `--generators sdk` and `--date-type Date`.
`transformers` assigns `Date` values to the sdk's date fields, so it only type-checks when the sdk types them as `Date`.
Selecting it without `--date-type Date` fails fast with an explanatory message rather than emitting a module that doesn't compile.
{% /admonition %}

## MSW mocks

Pass `--generators sdk,mock` to additionally emit a standalone `<output>.mocks.ts` module of [MSW](https://mswjs.io) v2 request handlers and `create<Schema>(overrides?)` data factories:

```sh
redocly generate-client openapi.yaml --output src/client.ts --generators sdk,mock
# → src/client.ts (the zero-dependency client) + src/client.mocks.ts (MSW handlers + factories)
```

Each handler intercepts its operation's method + path and responds with a fixture baked from the spec (prefers `example`/`default`; `format: binary` → `new Blob([])`.
Recursive schemas terminate at the cycle with an empty array/record).
Each `create<Schema>` factory builds the same default object and merges in any `overrides`, so factories double as test builders:

```ts
// test setup (Node)
import { setupServer } from 'msw/node';
import { handlers } from './client.mocks.ts';

const server = setupServer(...handlers);
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// override a single factory for one case
import { createMenuItem } from './client.mocks.ts';
const special = createMenuItem({ name: 'Cold Brew', price: 499 });
```

By default mock data is **baked** — deterministic literals inlined from the spec, with no extra runtime dependency.
Pass `--mock-data faker` to emit [`@faker-js/faker`](https://fakerjs.dev) calls for realistic data, and `--mock-seed <n>` to pin faker's PRNG so the data is reproducible:

```sh
redocly generate-client openapi.yaml --output src/client.ts \
  --generators sdk,mock --mock-data faker --mock-seed 42
```

{% admonition type="info" name="Compatibility" %}
`mock` requires `--generators sdk` (the factories reference its types).
Install MSW in your app as a dev dependency (`msw` `^2`).
For `--mock-data faker`, also install `@faker-js/faker`.
The generated client itself stays dependency-free — only the `*.mocks.ts` module imports them.
{% /admonition %}

## Custom generators

The built-in generators (`sdk`, `zod`, …) cover the common targets.
For anything else derived from the same description — validators in another library, a permissions map for your UI, mocks in your test runner's format, an SDK in your company's house style — write a **custom generator**.
It reads the same spec-agnostic model the built-ins consume and runs in the same command, so its output never drifts from the spec and you never parse OpenAPI yourself.

A generator is `{ name, run }` (plus optional compatibility metadata).
`run` receives the model and returns files; author it with `defineGenerator` for type inference:

```ts
// route-map-generator.ts
import { defineGenerator } from '@redocly/openapi-typescript/plugin';

export default defineGenerator({
  name: 'route-map',
  requires: ['sdk'], // optional contract: only valid alongside these generators
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

The `@redocly/openapi-typescript/plugin` entry also exports the **codegen toolkit** the built-in generators use — `ts` (the `ts.factory` wrapper), `printStatements`, `parseStatements`, `operationSignature`, `schemaToTypeNode`, `pascalCase`, `safeIdent` — and the IR types (`ApiModel`, `OperationModel`, `SchemaModel`, …), so a custom generator can emit TypeScript exactly as the first-party ones do.

### Select a custom generator

In `redocly.yaml`, a `generators` entry that is not a built-in name is an **import specifier**:

- a path (resolved against the `redocly.yaml` directory), or
- an installed package — that default-exports the generator

```yaml
# redocly.yaml — by path or by published package
x-openapi-typescript:
  input: ./openapi.yaml
  output: ./src/api/client.ts
  generators:
    - sdk
    - ./tools/route-map-generator.ts # local path
    - '@acme/openapi-valibot' # npm package
```

To register a generator **inline** (the function itself, with full type-safety and no install), use the programmatic API and pass it via `customGenerators`:

```ts
// generate.ts — run with `node --import tsx generate.ts`
import { generateClient } from '@redocly/openapi-typescript';
import routeMap from './tools/route-map-generator.ts';

await generateClient({
  input: './openapi.yaml',
  output: './src/api/client.ts',
  customGenerators: [routeMap], // register…
  generators: ['sdk', 'route-map'], // …then select by name
});
```

A worked example lives in [`examples/custom-generator`](https://github.com/Redocly/redocly-cli/tree/main/packages/openapi-typescript/examples/custom-generator).

{% admonition type="info" name="Compatibility & trust" %}
A custom generator declares the same `requires` / `facades` / `errorModes` / `dateTypes` contract as the built-ins, validated up front — an incompatible selection, a name that collides with another generator, or an unloadable specifier fails fast with an actionable message.
The generated client stays dependency-free.
A generator's output is its own file(s), and any libraries it targets are peers of _your app_.
Import-specifier generators execute at generation time.
It has the same trust level as any installed dependency you run.
{% /admonition %}

## Server-Sent Events (streaming)

An operation whose `2xx` response declares `text/event-stream` is generated as a typed async iterator under an `sse` namespace instead of as a regular call — no flag is required.
It is detected from the description.
Each event's `data` is typed from the OpenAPI 3.2 `itemSchema` (falling back to the media `schema`, then `string`).
When the payload is a structured type the runtime `JSON.parse`s `data` for you, otherwise it passes the raw string.

```ts
import { sse } from './client.ts';

for await (const ev of sse.streamMessages()) {
  console.log(ev.id, ev.data.text); // ev.data is the typed event payload
}
```

Each yielded `ServerSentEvent<T>` is `{ event?: string; data: T; id?: string; retry?: number }`.
With the **service-class** facade the same surface lives on the instance: `new Client(cfg).sse.streamMessages()`.

The stream **auto-reconnects** on a dropped connection, resuming from the last seen event id via the `Last-Event-ID` header (backoff honors the server's `retry:` field, then `reconnectDelay`, then 1s — exponential with jitter, capped at 30s).
Opt out or tune it per call:

```ts
// Disable reconnection, or set the base delay (ms).
for await (const ev of sse.streamMessages({ reconnect: false })) {
  /* … */
}
const stream = sse.streamMessages({ reconnectDelay: 500 });
```

To stop early, `break` out of the loop or pass an `AbortSignal` — both end the iterator **cleanly** (no error is thrown):

```ts
const ac = new AbortController();
setTimeout(() => ac.abort(), 5000);
for await (const ev of sse.streamMessages({ signal: ac.signal })) {
  /* … */
}
// loop ends without throwing when the signal aborts
```

SSE operations are **error-mode-agnostic**: they always throw an `ApiError` if the initial response is non-2xx, and never return the `--error-mode result` `Result` shape.

## Resources

- [Lint command](./lint.md) to validate your API description before generating a client.
- [Bundle command](./bundle.md) to combine a multi-file description into the single input file.
- [Configuration](../configuration/index.md) reference for `redocly.yaml`, including the `apis:` aliases you can pass as `<input>`.
