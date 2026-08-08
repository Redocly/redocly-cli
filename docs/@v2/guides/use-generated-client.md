# Use the generated client

How to consume the TypeScript client produced by [`generate-client`](../commands/generate-client.md): authentication, argument styles, error handling, middleware, retries, and the optional add-on generators.
For invoking the command itself (flags, output modes, config), see the [`generate-client` command reference](../commands/generate-client.md).
To shape what gets generated — publisher defaults, custom generators — see [Customize client generation](./customize-client-generation.md).

## Generators

`--generator` selects what to emit (default `sdk`).
Each non-`sdk` generator adds a standalone sibling module next to the client; the client itself never imports it, so an add-on never adds a dependency to the client.
Incompatible selections fail fast with an explanation.

| Generator        | Emits                                                                                                                                                                                                                                                           | App peer dependency                                      |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `sdk`            | The typed client (default).                                                                                                                                                                                                                                     | none                                                     |
| `zod`            | `<output>.zod.ts` — [Zod](https://zod.dev) schemas + [validation middleware](#runtime-validation).                                                                                                                                                              | `zod` `^3.23 \|\| ^4`                                    |
| `tanstack-query` | `<output>.tanstack.ts` — [TanStack Query](https://tanstack.com/query) v5 [factories](#tanstack-query-factories), including `<op>InfiniteOptions` for paginated operations. React by default; `tanstack-query-vue`/`-svelte`/`-solid` switch the adapter import. | `@tanstack/<framework>-query` `^5`                       |
| `swr`            | `<output>.swr.ts` — [SWR](https://swr.vercel.app) hooks.                                                                                                                                                                                                        | `swr` `^2`                                               |
| `mock`           | `<output>.mocks.ts` — [MSW](https://mswjs.io) v2 handlers + `create<Schema>` factories.                                                                                                                                                                         | `msw` `^2` (+ `@faker-js/faker` for `--mock-data faker`) |
| `transformers`   | `<output>.transformers.ts` — `transform<Name>` functions that parse wire dates to `Date`.                                                                                                                                                                       | none                                                     |
| `cli`            | `<output>.cli.ts` — a bin-ready [command-line interface](#generated-cli) over the client: typed flags, `--json` bodies, env auth, `--page-all`.                                                                                                                 | none                                                     |
| `cli-docs`       | `<output>.cli.md` — a Markdown [reference for the generated CLI](#cli-reference-docs): every command, flag, exit code, and credential variable.                                                                                                                 | none                                                     |

```sh
redocly generate-client openapi.yaml --output src/client.ts --generator sdk --generator zod --generator mock
```

`tanstack-query`, `swr`, and `cli` wrap the throw-mode `sdk` client, so they require `--error-mode throw`; `transformers` requires `--date-type Date`.
See the [`zod`](https://github.com/Redocly/redocly-cli/tree/main/tests/e2e/generate-client/examples/zod), [`tanstack-query`](https://github.com/Redocly/redocly-cli/tree/main/tests/e2e/generate-client/examples/tanstack-query), and [`mock`](https://github.com/Redocly/redocly-cli/tree/main/tests/e2e/generate-client/examples/mock) examples.

### Generated CLI

The `cli` generator emits `<stem>.cli.ts` — a zero-dependency, bin-ready command-line interface over the generated client.
Path params are positional, query params become typed `--kebab-name` flags (enums list their choices in `--help`, array params repeat the flag), and JSON request bodies arrive via `--json '<json>'`, `--json @file.json`, or `--json @-` (stdin).
Requests are validated before they are sent — selecting `cli` pulls in the generators it needs (`sdk` and `zod`), so nothing extra has to be listed.
That means the CLI's validation uses [zod](https://zod.dev/) at runtime: install it alongside the generated CLI (`npm i zod`).

```sh
redocly generate-client openapi.yaml --output src/client.ts --generator sdk --generator cli
npx tsx src/client.cli.ts orders listOrders --status open --limit 10
npx tsx src/client.cli.ts orders createOrder --json @order.json
npx tsx src/client.cli.ts orders listOrders --page-all   # one JSON page per line
npx tsx src/client.cli.ts schema createOrder             # the operation's full contract
```

`--help` lists the commands, and for tagged APIs those are grouped: run `<bin> <group> <command> --help` for one command's flags.
An operationId also works on its own (`<bin> listOrders`) when it is unambiguous, so you don't have to know its group.

Group and command names are cased differently, deliberately.
A group comes from an OpenAPI tag, which is prose — `Coffee Orders` is not typable without quoting — so it is slugged to `coffee-orders`.
A command name is the operationId, which is already an identifier, so it is used verbatim: `listOrders`, not `list-orders`.
That keeps one name for the operation across everything you generate — the CLI command, the TypeScript function, the Python method — so `listOrders` is searchable in your API description, your SDK, and your shell history alike.
Every global flag appears under `Global flags:` in the top-level help — `--server-url`, `--format json|ndjson`, `--dry-run`, `--page-all`, `--output`, `--token`, `--json` — together with the environment variables the CLI reads.

Credentials come from environment variables derived from the file stem (constant-cased): bearer → `<PREFIX>_TOKEN` (or `--token`), basic → `<PREFIX>_USERNAME`/`<PREFIX>_PASSWORD`, apiKey → `<PREFIX>_API_KEY_<SCHEME>`.
The help lists only what the description declares — an API with no bearer scheme shows no `--token` — and passing `--token` to such an API is a usage error (exit 4) naming the schemes it does accept, rather than a credential dropped in silence.
`--server-url` overrides the baked server; `--dry-run` prints the prepared request (credentials redacted) without sending it; blob responses require `--output <path>`; SSE operations stream events as one JSON object per line.

Exit codes are a documented contract, and errors print one JSON object to stderr so stdout stays clean for piping:

| Code | Meaning                                             |
| ---- | --------------------------------------------------- |
| 0    | success                                             |
| 1    | API error (status other than 401/403)               |
| 2    | auth error (401/403)                                |
| 3    | validation error (zod co-selected)                  |
| 4    | usage error (unknown command or flag, bad `--json`) |

`schema <command>` prints one operation's complete contract as JSON — method and path, the path and query parameters with their types and descriptions, whether a JSON body is accepted, the request and response schemas, and the flags that change how a call behaves (`paginated`, `sse`, `blob`).
It is the CLI's machine-readable surface: a script, a test harness, or an agent can discover the tool with `--help`, then read one `schema` call per command instead of parsing help text written for humans.

The CLI uses top-level `await`, so the nearest `package.json` must set `"type": "module"` — otherwise `tsx` reports `Top-level await is currently not supported with the "cjs" output format`, which doesn't point at the fix.
To ship it as a real bin, compile with `tsc` and point `package.json`'s `bin` at the compiled file.

#### CLI reference docs

The `cli-docs` generator writes `<stem>.cli.md`: a Markdown reference with the usage line, the global flags, the credential environment variables, the exit-code table, and one section per command listing its positionals and flags with types, defaults, and descriptions.
It renders from the same command table the CLI dispatches on, so the page cannot drift from the tool it documents — regenerate and the docs follow.
Selecting it pulls in the CLI it describes, so `--generator cli-docs` is enough.

```sh
redocly generate-client openapi.yaml --output src/client.ts --generator cli-docs
```

Two options shape the page, under `client.options.cli-docs`:

| Option        | Type    | Description                                                                                         |
| ------------- | ------- | --------------------------------------------------------------------------------------------------- |
| `title`       | string  | Page heading. Defaults to `<API title> CLI`.                                                        |
| `frontmatter` | boolean | Emit YAML front matter (`title`) above the heading, for docs sites that expect it. Default `false`. |

For a different structure or wording, [eject the generator](../commands/eject-generator.md) — the renderer is the template, so `redocly eject-generator cli-docs` hands you the page layout as code you own, with no template syntax to learn.
The same reference for the language SDKs is next.

### Language SDKs

`python`, `go`, and `php` emit a full SDK for that language — one self-contained file, no dependencies beyond the language's own HTTP support (`httpx` for Python; the standard library for Go; the curl extension for PHP).

One file is the deliverable, not a limitation we haven't gotten to: it can be downloaded from a docs page, committed, and read end to end, and it has no package to publish or import graph to wire up.
A description the size of a large public API produces a file of a few megabytes, which every one of these languages loads without trouble.
If you want a different layout, [eject the generator](../commands/eject-generator.md) — `run` returns the list of files, so splitting the output is a change to your own copy.

**They are the TypeScript client in another language.** Every capability is the same: typed models with `allOf` flattened, enums, discriminated unions decoded by their discriminator, one method per operation, auth, retries with `Retry-After` and jittered backoff, timeouts, idempotency keys, middleware, pagination iterators, SSE streaming, multipart bodies, binary downloads, typed response-header envelopes, and server-URL helpers for templated servers.
Configuration is the same too: [`serverUrl`](../commands/generate-client.md), [`dateType`](../commands/generate-client.md), [`pagination`](../configuration/reference/client.md#pagination-object), and [`codeSamples`](../configuration/reference/client.md) all apply.

```python
from openapi_client import Client

client = Client(auth={"bearer": "TOKEN"})
for order in client.list_orders_items(limit=50):
    print(order)
```

```php
require 'client.php';

use CafeOrders\{Client, Config};

$client = new Client(new Config(auth: ['bearer' => 'TOKEN']));
foreach ($client->listOrdersItems(limit: 50) as $order) {
    echo $order->id, PHP_EOL;
}
```

```go
api := client.New(client.Config{Auth: client.Auth{Bearer: func() string { return "TOKEN" }}})

for order, err := range api.ListOrdersItems(ctx, nil) {
    if err != nil {
        break
    }
    fmt.Println(order.Id)
}
```

#### Where the languages genuinely differ

Only where the language leaves no choice:

| Topic                | TypeScript                         | Python                                      | PHP                                     | Go                                           |
| -------------------- | ---------------------------------- | ------------------------------------------- | --------------------------------------- | -------------------------------------------- |
| Error handling       | `throw` or `result` (`errorMode`)  | `throw` or `result` (`errorMode`)           | exceptions — the language's error idiom | `(T, error)` — the language's error idiom    |
| Dates (`Date` mode)  | `Date`                             | `datetime` / `date`                         | `\DateTimeImmutable`                    | `time.Time` / `Date`                         |
| Response headers     | `{ envelope: true }` per call      | `<op>_with_headers()`                       | `<op>WithHeaders()`                     | `<Op>WithHeaders`                            |
| Auth credentials     | string or provider function        | string or callable                          | string or callable                      | provider function only (no union types)      |
| Reserved-word fields | not applicable                     | trailing `_` (`type_`), wire name preserved | trailing `_`, wire name preserved       | trailing `_` (`Type_`), `json` tag preserved |
| File layout          | `single` or `split` (`outputMode`) | one file                                    | one file                                | one file                                     |
| Namespacing          | ES module — the file path          | module name from the output stem            | namespace from the API title            | `package client`, or `goPackage`             |
| Runtime location     | embedded or package (`runtime`)    | embedded                                    | embedded                                | embedded                                     |

`argsStyle` shapes TypeScript call sites; each language SDK follows its own idiom instead (keyword arguments, named arguments, a params struct).
Setting an option a language can't apply prints a warning naming the option and the reason, so it never disappears silently.

#### Auth, middleware, and reserved names by language

Auth accepts a static credential or a provider resolved per request:

```python
client = Client(auth={"bearer": "TOKEN"})
client = Client(auth={"bearer": lambda: fresh_token()})
client = Client(auth={"apiKey": {"SecretApiKey": "KEY"}})   # "api_key" also accepted
```

```php
$client = new Client(new Config(auth: ['bearer' => 'TOKEN']));
$client = new Client(new Config(auth: ['bearer' => fn () => freshToken()]));
$client = new Client(new Config(auth: ['apiKey' => ['SecretApiKey' => 'KEY']]));
```

```go
// Go has no union types, so a credential is always a function — even a static one.
api := client.New(client.Config{Auth: client.Auth{
    Bearer: func() string { return "TOKEN" },
    APIKey: map[string]func() string{"SecretApiKey": func() string { return "KEY" }},
}})
```

Middleware is the language's natural shape, and is **not** PSR-15/PSR-18 or an HTTPX event hook — it is this contract:

```php
// PHP: an onion. Each callable receives the request array and the next link.
// Request keys: operationId, method, url, headers, query, and optionally body,
// contentType, idempotencyKey. The response array carries status, headers, body,
// url, timedOut.
$log = function (array $request, callable $next) use ($logger): array {
    $logger->info('request', ['op' => $request['operationId'], 'url' => $request['url']]);
    $response = $next($request);
    $logger->info('response', ['status' => $response['status']]);
    return $response;
};
$client = new Client(new Config(middleware: [$log]));
```

```python
# Python: hooks. on_request sees the request context; on_response may return a
# replacement response.
import logging

def log_request(context):
    logging.info("%s %s", context["method"], context["url"])

client = Client(middleware=[{"on_request": log_request}])
```

```go
// Go: hooks on the real *http.Request / *http.Response.
api := client.New(client.Config{Middleware: []client.Middleware{{
    OnRequest:  func(r *http.Request) { log.Println(r.Method, r.URL) },
    OnResponse: func(r *http.Response) { log.Println(r.Status) },
}}})
```

A property or parameter whose name is a reserved word gets a trailing underscore, while the wire name is preserved — `tag.type_` in Python, `$tag->type_` in PHP, `tag.Type_` in Go, all serializing as `type`.
The same applies to method arguments: `list_tags(type_=...)`, `ListTagsParams{Type_: ...}`.

Type and method **names** are resolved once, in the shared model, against a reserved set that is the union across the supported languages.
A schema therefore keeps the same name in every SDK you generate from the description — `Error` becomes `Error_2` in the Python SDK too, even though Python would accept `Error`, so an API's TypeScript, Python, PHP, and Go clients stay talkable-about with one vocabulary.
Every rename is reported with its cause, so a publisher who wants a different name renames the schema or operation in the description.

## Package runtime

By default the runtime is embedded in the generated file, so the client is self-contained.
With [`--runtime package`](../commands/generate-client.md#choose-a-runtime) the generated file instead imports the runtime from `@redocly/client-generator` — your application code is **identical in both modes** (same exports, same call shapes); only where the engine lives changes.
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

**Every generated TypeScript file is erasable TypeScript**, so type stripping alone is enough — the client, the zod module, and the generated CLI all run under plain `node` with no build step.
Nothing emitted needs a transform to become JavaScript: no `enum`, no `namespace`, and no constructor parameter properties (`constructor(readonly id: string)`), which strip-only mode rejects because it would have to generate assignments.

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
Bearer and apiKey credentials accept a **`TokenProvider`** — a string or a (possibly async) function called per request, useful for refresh flows:

```ts
import { setBearer } from './client.ts';

setBearer(async () => await getFreshAccessToken());
```

Each setter is shorthand for the exported `client` instance's `auth` member (`export const setBearer = client.auth.bearer;`), so it configures that instance.
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

An unknown top-level key in the grouped object (for example a leftover flat-style `{ limit: 10 }` instead of `{ params: { limit: 10 } }`) fails the call with a `TypeError` naming the key.
TypeScript catches this at compile time; the runtime check covers transpilers that skip type-checking, so a mis-shaped call never silently drops data.

## Read-only properties

A property marked `readOnly: true` is server-managed, so the generated request body type leaves it out: a body that references a named schema becomes `Omit<Order, 'id' | 'createdAt'>`, and an inline object simply drops those properties.
Response types keep them.
The zod schemas and the mock factories read the same flag, so the type, the runtime validation, and the fixtures agree.

Where `readOnly` sits matters, and it follows the specification version:

- **OpenAPI 3.1** uses JSON Schema 2020-12, where `$ref` is an ordinary keyword.
  Keywords beside a `$ref` take effect, so `{ $ref: './Entitlements.yaml', readOnly: true }` marks the property read-only.
- **OpenAPI 3.0 and 2.0** predate that: a `$ref` replaces the whole schema object, so a sibling `readOnly` has no meaning and is ignored.
  Generation warns when it finds one, naming the property, because the intent is usually clear and silence would leave the property in every request body.
  The [`spec-ref-siblings`](../rules/oas/spec-ref-siblings.md) rule flags the same thing when you lint.
  To mark a referenced property read-only in 3.0, inline the schema or wrap the `$ref` in an `allOf`.

## Error handling

By default (`--error-mode throw`) an operation throws `ApiError` on any non-2xx response and returns the success body directly.
With `--error-mode result` it never throws for HTTP errors, returning a discriminated `Result<TData, TError>` whose `error` is typed from the description's 4xx/5xx bodies:

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
Register with `use()` (shorthand for `client.use()`); it accepts several at once:

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

`onRequest` runs in registration order; `onResponse` runs in reverse order.
`onRequest` may mutate `ctx` (`url`, `method`, `headers`, and `body` — body edits are serialized and sent); `onResponse` may return a replacement `Response`.
`onError` (throw mode only) is threaded through each middleware.
`ctx.operation`'s fields are typed as literal unions from the description (`OperationId`/`OperationPath`/`OperationTag`), so `ctx.operation.id === '…'` and `ctx.operation.tags.includes('…')` autocomplete, and a misspelled operation id fails compilation instead of silently never matching.
A header for a single call instead goes in that operation's trailing `init` argument.
Per-request headers merge lowest to highest — the caller always wins:

1. Injected auth credentials.
2. Typed header parameters.
3. The caller's `init.headers`.

Outside browsers, the client also identifies itself to the API with an `X-Redocly-Client` header (useful for the API owner's telemetry).
Override it with `configure({ clientHeader: 'my-service/2.0' })`, or disable it with `clientHeader: false`.
Browsers never send it — a custom header would force a CORS preflight.

`use()` appends to the middleware chain, composing with any already-registered or publisher pre-configured middleware.
`configure({ middleware: [...] })` replaces the whole chain — use it to reset, but prefer `use()` to add to existing (including [publisher pre-configured](./customize-client-generation.md#publisher-defaults)) middleware.

See the [`configure-and-middleware` example](https://github.com/Redocly/redocly-cli/tree/main/tests/e2e/generate-client/examples/configure-and-middleware) for a runnable version.

## Retries

Retry is **opt-in**, configured through `ClientConfig` with an optional per-call override:

```ts
configure({ retry: { retries: 3 } }); // the module's client instance
const other = createClient<Ops>(OPERATIONS, { retry: { retries: 3 } }); // another instance
await getOrderById('ord_123', {}, { retry: { retries: 5 } }); // per call
```

By default only **idempotent** methods (`GET`, `HEAD`, `PUT`, `DELETE`, `OPTIONS`) are retried, on a network error or a transient status (`408`, `429`, `500`, `502`, `503`, `504`).
`POST`/`PATCH` are not, since re-sending can duplicate side effects — opt in with a custom `retryOn` when safe.

A custom `retryOn` **replaces** the default policy entirely — a predicate like `({ response }) => (response?.status ?? 0) >= 500` silently stops retrying network errors and timeouts, which have no `response`.
Compose with the exported default instead: `retryOn: (ctx) => defaultRetryOn(ctx) || myRule(ctx)`.

For APIs that support [idempotency keys](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/), set `idempotencyKey: true` (or a key factory) on the instance: every `POST`/`PATCH` gets an `Idempotency-Key` header — one stable key per logical call, re-sent unchanged on every retry attempt — and the default retry policy then treats those requests as safe to retry.
Per call, pass a literal key (`{ idempotencyKey: 'order-42-submit' }`) or `false` to skip; a caller-set `Idempotency-Key` header always wins.
Backoff is exponential with full jitter (`retryStrategy: 'fixed'` for a constant delay); a `Retry-After` header takes precedence; an aborted `AbortSignal` stops retries immediately.

A `timeout` (milliseconds) aborts an attempt that takes too long — including reading the body — and composes with your own `AbortSignal`.
Each retry attempt gets a fresh budget; a timed-out attempt retries under the same policy as a network error.
When retries are exhausted, the failure surfaces as a `TimeoutError` (exported next to `ApiError`) carrying `operationId`, the effective `timeout`, and the `attempt` number — everything a log line needs.
Set it on the instance (`configure({ timeout: 10_000 })`) or per call (`{ timeout: 500 }`, where `0` disables the instance default).
SSE streams are long-lived by design and never inherit the instance timeout.

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

`Blob`/strings pass through, arrays append one field per item, nested objects are JSON-encoded, `undefined`/`null` are skipped.
A multipart body whose schema isn't a concrete object keeps the raw `FormData` type.
`format: byte` (base64) stays a `string`.

## Response decoding

The client reads each response by negotiating from its `Content-Type` (JSON, then `text/*`, then `Blob`).
Force a reader per call with `parseAs`:

```ts
const res = await getMenuItemPhoto('prd_123', { parseAs: 'stream' });
```

`parseAs` accepts `'json'`, `'text'`, `'blob'`, `'arrayBuffer'`, `'formData'`, `'stream'`, or `'auto'` (default).
It changes the runtime reader only, not the static return type.

An operation whose success response declares no content is typed `void`.
However, if the server sends a JSON body anyway (a gap in the API description), the runtime still parses and returns it rather than silently dropping real data.
Reach it with a cast while the description catches up.

## Response headers (envelope)

By default throw mode returns only the parsed success body.
When you need response headers (pagination totals, rate limits, `Location`, and so on) without switching to `--error-mode result`, pass `{ envelope: true }` on that call:

```ts
// Flat args (default): query/body slots, then per-call init.
const { data, headers, response } = await listCustomers({ limit: 1 }, { envelope: true });

headers.paginationTotal; // number — required Pagination-Total in the description
headers.xFlag; // boolean | undefined — optional X-Flag
response.headers.get('X-Undocumented'); // anything not declared in OpenAPI

// Grouped args / instance client: trailing init is always separate.
const envelope = await client.listCustomers({ params: { limit: 1 } }, { envelope: true });
```

- `headers` is a safe camelCase object of headers declared on the operation's success response.
  String, number, and boolean schemas drive the TypeScript type and number/boolean coercion.
  Complex header schemas remain strings because HTTP exposes header values as text.
  Required response headers are required properties — the type trusts the API description, the same way response body types do.
  Colliding normalized names get a deterministic numeric suffix.
- `response` is the raw `Response` — use it for undocumented headers.
- Non-2xx responses still throw `ApiError`.
- Default call sites stay body-only (non-breaking), including calls that pass other options (`headers`, `signal`, `parseAs`, a retry override).
- In `--error-mode result` the flag is ignored; that mode already returns `response`.
- The TanStack Query and SWR wrappers don't accept `envelope`.
  It's excluded from their options and stripped from the forwarded call, so cached data is always the plain body.
  Call the sdk function directly when you need headers.
- The Python, PHP, and Go SDKs expose the same information as separate variants — `<op>_with_headers()`, `<op>WithHeaders()`, and `<Op>WithHeaders` — emitted only for operations that declare success-response headers (those languages cannot vary a return type on a flag).

## Runtime validation

The `zod` generator emits `operationSchemas` — request/response validators keyed by operationId — and the `zodValidation` middleware that wires them into the client:

```ts
import { use } from './api/client';
import { zodValidation } from './api/client.zod';

use(zodValidation()); // validate request bodies and JSON responses
```

The two directions default differently, because they catch different parties' bugs:

- An invalid **request** body throws `ZodValidationError` before any network call — it is the caller's own bug, caught at the cheapest possible moment.
- A successful JSON **response** that drifts from its schema **warns by default** (via `console.warn`, or a custom `onViolation` callback) and lets the call succeed — a server drifting from its description should not crash the consumer. Pass `response: 'throw'` for the strict behavior (it then throws even on result-mode clients), or `response: false` to skip.

`ZodValidationError` carries `operationId`, `direction`, the raw zod `issues`, and flattened `violations` — each with the full nested path (union branches included) and a truncated preview of the offending value, so the failing field is identifiable without reproducing the payload.
Note that previews can surface payload data; point `onViolation` at a scrubbed logger when responses may carry secrets.

For servers that reject undeclared properties, `stripRequestBodies: true` replaces the outgoing body with the parsed result, dropping any key the schema does not declare (a spread like `{ ...entity }` compiles past TypeScript's excess-property check but would otherwise reach the wire as-is).
Operations without a JSON body pass through untouched, and payloads are never mutated unless `stripRequestBodies` is set.
Pass `{ request: false }` to narrow the scope, or import a schema from `operationSchemas` for a one-off check.

## Operation metadata

The client exports an `OPERATIONS` map keyed by operationId — the same **operation descriptors** the runtime routes requests by, holding each operation's `method`, `path` template, `tags`, and wire shape:

```ts
export const OPERATIONS = {
  getOrderById: { id: 'getOrderById', method: 'GET', path: '/orders/{orderId}', tags: ['Orders'] },
  // …
} as const satisfies Record<string, OperationDescriptor>;
```

Because keys and values are plain string literals, they survive bundling/minification — making `OPERATIONS` the stable handle for cache keys, span names, or log labels (rather than `fn.name`, which a minifier can rename).
Every client method also carries its own identity as `client.getOrderById.operationId` — an explicit, minification-proof cache key for consumer wrappers (react-query keys and the like).
The same `OperationId` / `OperationPath` / `OperationTag` unions type `ctx.operation` in middleware.

## Discriminated unions

A `oneOf` / `anyOf` with a usable discriminator gets an exported `is<Member>` type guard per member, taken from the description's `discriminator` or inferred when every member pins a shared property to a distinct string `const`:

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

Pagination is declared, never guessed: describe how your API paginates in `redocly.yaml` under `client.pagination`, or per operation with the `x-redoclyPagination` extension in the description.
The rule fields, the generate-time verification, and the precedence between the convention, `x-redoclyPagination`, and per-operation overrides are documented in the [`client.pagination` reference](../configuration/reference/client.md#pagination-object); there is no CLI flag.
Each paginated operation keeps its one-shot call and gains two async iterators — `.pages(args?, init?)` yielding full pages and `.items(args?, init?)` yielding individual items, typed statically from the response schema.

Four styles are supported:
`cursor` sends the response's `nextCursor` back in `cursorParam`, stops when it's absent, `null`, or empty, and throws if the server returns the same cursor twice in a row.
For connection-style APIs whose cursor stays non-null on the last page, add the optional `hasMore` pointer (for example `/pageInfo/hasNextPage`) — iteration stops as soon as it resolves to `false`, skipping the follow-up empty request.
`offset` advances `offsetParam` by each page's item count, and `page` increments `offsetParam` by 1; both stop on an empty page.
`link` follows the response's RFC 8288 `Link` header `rel="next"` target (the GitHub pattern) — no advance parameter at all: the runtime merges the target's query params into the next call, so every page goes through the same declared endpoint (auth and middleware apply unchanged, and credentials are never handed to a cross-origin URL); iteration stops when no `rel="next"` is present and throws if the target repeats.
A `link` convention rule applies only to operations whose success response _documents_ a `Link` header; an explicit rule applies regardless but warns when the header is undocumented.
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

The flat free functions keep both iterators.
Note that the flat function itself takes positional arguments, but its `.pages`/`.items` always take the grouped shape — they are the client method's iterators.

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

A failed page always aborts iteration by throwing `ApiError`, even on an `--error-mode result` client.
On a result-mode client, `.pages()` yields raw pages rather than `{ data, error, response }` envelopes — only the one-shot call keeps the envelope — and the throw-mode-only `onError` middleware hook is not invoked.

For shapes the built-in styles don't cover — for example a cursor that travels in the request body or a header — page with a small hand-written helper over the generated call, which stays fully typed end to end (see the [`custom-pagination` example](https://github.com/Redocly/redocly-cli/tree/main/tests/e2e/generate-client/examples/custom-pagination)).

## TanStack Query factories

The `tanstack-query` generator emits typed TanStack Query v5 factories per operation:

- `<op>Options(vars, init?)` per query (GET/HEAD) — pass to `useQuery`/`prefetchQuery`. Its `queryFn` forwards TanStack's abort `signal` into the request, so an unmounted or superseded query cancels its network call.
- `<op>InfiniteOptions(vars, init?)` per **paginated** query — pass to `useInfiniteQuery`/`fetchInfiniteQuery`. The `initialPageParam`/`getNextPageParam` pair is compiled from the same [pagination](#pagination) rule that powers `.pages()`/`.items()`, including the `hasMore` stop, so infinite queries need no hand-written `getNextPageParam`. (`link`-style operations are the exception — their next page lives in a response header a `queryFn` cannot see; use the sdk's `.pages()`/`.items()` iterators for those.)
- `<op>QueryKey(vars?)` — with `vars`, the exact key the options use; **without arguments, the invalidation prefix** that matches every cached page and filter of the operation: `queryClient.invalidateQueries({ queryKey: listOrdersQueryKey() })`.
- `<op>Mutation(init?)` per mutation — per-call `RequestOptions` (headers, a retry override) reach the mutation's requests.

The module-level factories bind the sdk's default `client`.
For an isolated instance (its own credentials, middleware, retry), build a bound set with `createQueryFactories`:

```ts
import { createClient } from '@redocly/client-generator';
import { OPERATIONS, type Ops } from './api/client';
import { createQueryFactories } from './api/client.tanstack';

const internal = createQueryFactories(
  createClient<Ops>(OPERATIONS, { auth: { basic: { username: 'svc', password: 's3cr3t' } } })
);
useQuery(internal.getOrderOptions({ orderId }));
```

When several generated APIs share one `QueryClient`, their operationIds can collide (two APIs with a `check` operation would mix caches).
Set `queryKeyPrefix` in the `client` block to namespace every key: `queryKeyPrefix: main` makes the keys `['main', 'check', vars]`.

## Format and lint the generated files

The generator prints one canonical style — the TypeScript compiler's printer (four-space indent, double quotes).
If your project's formatter enforces a different style, its check fails on freshly generated files.
Either run your formatter over the output right after generating (for example, as the next step in the same script), or add the generated paths to your formatter's ignore list — generated files are not hand-edited, so reformatting them is churn without review value.

Linting is different: the generated code is expected to pass strict lint configurations as-is (no `any`, no non-null assertions, no unused imports).
If your linter flags generated output, [report it](https://github.com/Redocly/redocly-cli/issues) — that is a generator bug, not a style choice.

## Resources

- [`generate-client` command](../commands/generate-client.md) — flags, output modes, and invocation.
- [`client` configuration](../configuration/reference/client.md) — the `redocly.yaml` `client` block.
- [Customize client generation](./customize-client-generation.md) — publisher defaults and custom generators.
