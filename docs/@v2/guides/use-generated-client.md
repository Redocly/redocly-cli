# Use the generated client

This guide tells you how to use the TypeScript client that [`generate-client`](../commands/generate-client.md) produces.
It covers authentication, argument styles, error handling, middleware, retries, and the optional add-on generators.
For the command itself (flags, output modes, config), see the [`generate-client` command reference](../commands/generate-client.md).
To change what the command generates (publisher defaults, custom generators), see [Customize client generation](./customize-client-generation.md).

## Generators

The `--generator` option selects the output (default `typescript`).
Each non-`typescript` generator adds a standalone module next to the client.
The client never imports this module.
Because of this, an add-on never adds a dependency to the client.
Incompatible selections fail immediately with an explanation.

| Generator        | Emits                                                                                                                                                                                                                                                     | App peer dependency                                      |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `typescript`     | The typed client (default).                                                                                                                                                                                                                               | none                                                     |
| `zod`            | `<output>.zod.ts`: [Zod](https://zod.dev) schemas and [validation middleware](#runtime-validation).                                                                                                                                                       | `zod` `^3.23 \|\| ^4`                                    |
| `tanstack-query` | `<output>.tanstack.ts`: [TanStack Query](https://tanstack.com/query) v5 [factories](#tanstack-query-factories), with `<op>InfiniteOptions` for paginated operations. React by default; `tanstack-query-vue`/`-svelte`/`-solid` change the adapter import. | `@tanstack/<framework>-query` `^5`                       |
| `swr`            | `<output>.swr.ts`: [SWR](https://swr.vercel.app) hooks.                                                                                                                                                                                                   | `swr` `^2`                                               |
| `mock`           | `<output>.mocks.ts`: [MSW](https://mswjs.io) v2 handlers and `create<Schema>` factories.                                                                                                                                                                  | `msw` `^2` (+ `@faker-js/faker` for `--mock-data faker`) |
| `transformers`   | `<output>.transformers.ts`: `transform<Name>` functions that parse wire dates to `Date`.                                                                                                                                                                  | none                                                     |
| `cli`            | `<output>.cli.ts`: a [command-line interface](#generated-cli) for the client, ready to use as a bin. It has typed flags, `--json` bodies, env auth, and `--page-all`.                                                                                     | none                                                     |

```sh
redocly generate-client openapi.yaml --output src/client.ts --generator typescript --generator zod --generator mock
```

`tanstack-query`, `swr`, and `cli` wrap the throw-mode `typescript` client.
Because of this, they require `--error-mode throw`.
The `transformers` generator requires `--date-type Date`.
See the [`zod`](https://github.com/Redocly/redocly-cli/tree/main/tests/e2e/generate-client/examples/zod), [`tanstack-query`](https://github.com/Redocly/redocly-cli/tree/main/tests/e2e/generate-client/examples/tanstack-query), and [`mock`](https://github.com/Redocly/redocly-cli/tree/main/tests/e2e/generate-client/examples/mock) examples.

### Generated CLI

The `cli` generator emits `<output>.cli.ts`, the CLI module next to the client (`client.cli.ts` for `client.ts`).
This file is a zero-dependency command-line interface for the generated client, ready to use as a bin.
Path parameters are positional.
Query parameters become typed `--kebab-name` flags.
Enum flags list their choices in `--help`, and array parameters repeat the flag.
Supply a JSON request body with `--json '<json>'`, `--json @file.json`, or `--json @-` (stdin).
The CLI validates each request before it sends it.
When you select `cli`, the command also selects the generators it needs (`typescript` and `zod`), so you do not have to list them.
Because of this, the CLI validation uses [zod](https://zod.dev/) at runtime.
Install zod next to the generated CLI (`npm i zod`).

```sh
redocly generate-client openapi.yaml --output src/client.ts --generator typescript --generator cli
npx tsx src/client.cli.ts listOrders --status open --limit 10
npx tsx src/client.cli.ts createOrder --json @order.json
npx tsx src/client.cli.ts listOrders --page-all         # one JSON page per line
npx tsx src/client.cli.ts schema createOrder             # the operation's full contract
```

**The operationId alone is the command**: `<bin> listOrders`.
You do not have to know which tag the operation carries.
Run `<bin> listOrders --help` to show the flags of one command.

A tag adds a group, and the group organizes `--help`.
This matters for an API with hundreds of operations: `<bin> --help` lists the groups, and `<bin> orders --help` lists the commands of one group.
A group also addresses a command (`<bin> orders listOrders`), which is what you would type after browsing that group, but it is never required.
Two commands cannot share a name: when a description declares the same `operationId` twice, the generator reports it and emits the second as `<name>_2`.
The first word is a group when it matches a group slug, and a command name in every other case.
Because of this, an operation that carries a tag and is also named after a tag (`operationId: orders` in an API that has an `orders` tag) is available as `<bin> <its own tag> orders`, and `<bin> orders` shows the `orders` group.
An operation with no tag keeps the bare form, because a group cannot address it, and the group of that name then has no help page.
The generator reports both cases when it writes the CLI, so you can rename the operation or the tag.
An operation with no `operationId` still gets a command.
The generator derives the name from the method and the path (`GET /pets` becomes `getPets`, and `GET /pets/{id}` becomes `getPetsId`), so a description without operationIds has a complete CLI.

Group names and command names use different cases, and this is deliberate.
A group name comes from an OpenAPI tag, which is prose.
You cannot type `Coffee Orders` without quotes, so the CLI converts the tag to a slug: `coffee-orders`.
A command name is the operationId, which is already an identifier.
Because of this, the CLI uses it unchanged: `listOrders`, not `list-orders`.
As a result, the operation keeps one name in all generated output: the CLI command, the TypeScript function, and the Python method.
You can search for `listOrders` in your API description, in your SDK, and in your shell history.
The top-level help shows every global flag under `Global flags:`: `--server-url`, `--format json|ndjson`, `--dry-run`, `--page-all`, `--output`, `--token`, and `--json`.
The same section shows the environment variables that the CLI reads.

The CLI reads credentials from environment variables.
The prefix is the output file name in constant case: `MY_API_*` for `my-api.ts`.
The prefix is fixed when the file is generated, so the variables stay the same whatever you install the command as.
To change them, rename the output file.
For bearer auth, use `<PREFIX>_TOKEN` (or `--token`).
For basic auth, use `<PREFIX>_USERNAME` and `<PREFIX>_PASSWORD`.
For apiKey auth, use `<PREFIX>_API_KEY_<SCHEME>`.
The help lists only the schemes that the description declares.
An API with no bearer scheme shows no `--token` flag.
If you pass `--token` to such an API, the CLI reports a usage error (exit 4) and names the schemes that the API accepts.
The CLI does not drop the credential silently.
`--server-url` overrides the built-in server URL.
`--dry-run` prints the prepared request with the credentials redacted and does not send it.
Blob responses require `--output <path>`.
SSE operations stream events as one JSON object per line.

The exit codes are a documented contract.
Errors print one JSON object to stderr, so stdout stays clean for pipes:

| Code | Meaning                                             |
| ---- | --------------------------------------------------- |
| 0    | success                                             |
| 1    | API error (status other than 401/403)               |
| 2    | auth error (401/403)                                |
| 3    | validation error (zod co-selected)                  |
| 4    | usage error (unknown command or flag, bad `--json`) |

`schema <command>` prints the complete contract of one operation as JSON.
The output includes the method and path, and the path and query parameters with their types and descriptions.
It also shows if the operation accepts a JSON body, the request and response schemas, and the flags that change call behavior (`paginated`, `sse`, `blob`).
This is the machine-readable surface of the CLI.
A script, a test harness, or an agent can discover the tool with `--help`.
It can then read one `schema` call for each command, and it does not have to parse help text written for humans.

#### Compose and extend the CLI

The generated module is a library and also a binary.
It exports `COMMANDS`, `wiring`, and `run`, and it executes itself only when it is the process entry.
This makes two things possible without changes to the generated files.

**One binary for several APIs.**
Set a top-level `client.cliOutput`.
Then `redocly generate-client` (no api argument) emits a composed entry for every api that emits a cli module.
Each api's alias from `apis:` becomes its command namespace (`shop` and `kitchen` below).
The CLI reads each api's credentials under `<ENTRY>_<ALIAS>_*`, where `<ENTRY>` is the entry file name in constant case:

```yaml
client:
  cliOutput: ./src/cafe.ts
  generators: [typescript, cli]
apis:
  shop: { root: ./shop/openapi.yaml, clientOutput: ./src/shop.ts }
  kitchen: { root: ./kitchen/openapi.yaml, clientOutput: ./src/kitchen.ts }
```

```sh
npx tsx src/cafe.ts shop listOrders --limit 3          # CAFE_SHOP_TOKEN
npx tsx src/cafe.ts kitchen createOrder --json @o.json # CAFE_KITCHEN_TOKEN
```

Two different things can stand in the word after the command, so compare the two setups.
For one API, an operationId is the whole command (`cafe listOrders`), and a tag slug goes in front of it only to resolve an ambiguous name (`cafe orders listOrders`).
For a composed binary, that first word is the api alias, because an operationId is unique only inside one description: `cafe shop listOrders`.
A tag group of that api nests inside its alias, again only when it is needed: `cafe shop orders listOrders`.

An operationId is unique only inside one description.
Because of this, each command carries its api's alias as a namespace.
If two descriptions declare the same operationId, the result is two different commands.
Each api keeps its own server URL, schemes, and credentials.

The CLI has no name of its own to configure.
It reads the name it was invoked as from the process, so `--help` always shows the command you typed.
When the process starts from the file itself, such as `node dist/cafe.cli.js` or a Windows `bin` shim, the help drops the script extension and shows `cafe`.
To type `cafe` instead of `npx tsx src/cafe.ts`, compile the entry and point the `bin` field of your `package.json` at the compiled file.
The end of this section shows this step.

**Commands the description doesn't have.**
A custom command is the same data shape plus a `handler`.
Because of this, it inherits the help, the parsing, `schema`, and the exit codes.
Use this to add behavior that is not in a description, for example a `login` or a doctor command.
The custom command lives in a file that you own:

```ts
import { runCli, type CustomCommand } from '@redocly/client-generator';
import { SOURCES } from './src/cafe.ts'; // the composed entry exports its sources

const login: CustomCommand = {
  name: 'login',
  summary: 'Fetch and store a token.',
  handler: async ({ wiring }) => {
    const token = await deviceFlow(); // yours: any flow the API offers
    saveCredentials({ CAFE_SHOP_TOKEN: token }); // yours: file, keychain, anything
    wiring.stdout('Logged in.');
    return 0;
  },
};

process.exit(await runCli([{ commands: [login] }, ...SOURCES], process.argv.slice(2)));
```

The CLI reads credentials from `wiring.env`.
The generated entry sets this field to `process.env`, and the composed entry keeps that value.
If your wrapper keeps a token in a file, write the token to `process.env` before the wrapper runs a command.
Use `Object.assign(process.env, stored)`.
The CLI then reads the token in the same way as a variable from the shell.
If the wrapper must not change the global environment, give the source its own env:
`{ ...source, wiring: { ...source.wiring, env: { ...process.env, ...stored } } }`.
The generator itself supplies no credential store and no login command.
The auth flow of each API is different, so you supply these parts.
This section shows the procedure.

#### Ship it as a real command

The command name is yours, and generation never sets it.
The generated file is a module until you point a `bin` field at it, and these three steps are what make `cafe` a command on your machine.

First, the CLI uses top-level `await`, so the nearest `package.json` must set `"type": "module"`.
Without this setting, `tsx` reports `Top-level await is currently not supported with the "cjs" output format`, and that message does not point to the fix.

Second, compile the entry with `tsc` and declare the compiled file as the bin.
For one API the entry is the CLI module, `<output>.cli.ts`, so `src/cafe.ts` compiles to `dist/cafe.cli.js`.
For a composed binary the entry is `cliOutput` itself, so `./src/cafe.ts` compiles to `dist/cafe.js`.
The client module is not an entry, and a `bin` field that points at it gives you a command that does nothing:

```json
{
  "type": "module",
  "bin": { "cafe": "./dist/cafe.cli.js" },
  "scripts": { "build": "tsc" }
}
```

Third, install the package, or link it while you develop:

```sh
npm run build && npm link
cafe listOrders --limit 3     # CAFE_TOKEN from the environment
```

The help output follows the name you install, because the CLI reads it from the process.
The credential variables do not: they come from the output file name, so a renamed command never invalidates the variables your users already set.
For a one-off run, `npx tsx src/cafe.cli.ts listOrders --limit 3` uses the same entry with no build step.
Only the `cli` generator emits a command: the `python`, `go`, and `php` SDKs are libraries.

### Language SDKs

The `python`, `go`, and `php` generators each emit a full SDK for that language.
The SDK is one self-contained file.
It has no dependencies other than the HTTP support of the language: `httpx` for Python, the standard library for Go, and the curl extension for PHP.

One file is the intended deliverable, not a limitation.
Users can download the file from a docs page, commit it, and read it from start to end.
There is no package to publish and no import graph to connect.
A description the size of a large public API produces a file of a few megabytes.
Each of these languages loads a file of that size without problems.
If you want a different layout, [eject the generator](../commands/eject-generator.md).
The `run` function returns the list of files, so you can split the output with a change to your own copy.

**They are the TypeScript client in another language.**
Every capability is the same: typed models with `allOf` flattened, enums, discriminated unions decoded by their discriminator, and one method per operation.
The SDKs also include [auth](#authentication), retries with `Retry-After` and jittered backoff, timeouts, idempotency keys, middleware, and pagination iterators.
They also include SSE streaming, multipart bodies, binary downloads, typed response-header envelopes, and server-URL helpers for templated servers.
Configuration is the same too: [`serverUrl`](../commands/generate-client.md), [`dateType`](../commands/generate-client.md), [`pagination`](../configuration/reference/client.md#pagination-object), and [`codeSamples`](../configuration/reference/client.md) all apply.
Each language names its output in its own way: the Python module comes from the output file name, the PHP namespace comes from the API title, and Go uses `package client` or [`goPackage`](../configuration/reference/client.md).
If you set an option that a language cannot apply, the generator prints a warning with the option name and the reason.
The option never disappears silently.

```python
from openapi_client import Client

client = Client(auth={"bearer": "TOKEN"})
for order in client.list_orders_items(limit=50):
    print(order)
```

The Python models are dataclasses, so `httpx` stays the only requirement.
If your project expects [pydantic](https://docs.pydantic.dev/) models, ask for them:

```yaml
client:
  generators: [python]
  options:
    python:
      models: pydantic # default: dataclass
```

Every class then extends `BaseModel`, and a wire name that is not a legal Python field name becomes a field alias.
The call sites do not change: the same class names, the same field names, the same client.
Pydantic then validates each response as the SDK decodes it, so a response that does not match the description raises `ValidationError` instead of passing through.
This mode needs `pydantic` next to `httpx`, and the header of the generated file says so.
A discriminated union keeps its discriminator in both modes, and each member declares its own value as a `Literal`.
For this to work, every member schema must declare the discriminator property.
When a member omits it, pydantic matches the members of a nested union by shape, which can select the wrong one.

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

#### Auth, middleware, and reserved names by language

Every language gives credentials to a client instance, and the constructor is that one way.
`createClient(OPERATIONS, { auth })` in TypeScript is the same thing as the constructors below.
TypeScript adds `configure({ auth })` for one reason: it also exports a module-level client, whose methods the module exports by name, and `configure` is how you set up that instance.
The Python, PHP, and Go SDKs export no module-level client, so they need no equivalent.

Auth accepts a static credential, or a provider function that the client resolves for each request:

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

Middleware follows the natural shape of each language.
It is **not** PSR-15/PSR-18 or an HTTPX event hook.
It is this contract:

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

A property or parameter whose name is a reserved word gets a trailing underscore.
The wire name does not change.
For example, `tag.type_` in Python, `$tag->type_` in PHP, and `tag.Type_` in Go all serialize as `type`.
The same applies to method arguments: `list_tags(type_=...)`, `ListTagsParams{Type_: ...}`.

OpenAPI lets one operation use the same parameter name in two locations, such as `id` in the path and `id` in the query.
The SDKs whose methods take one argument per parameter cannot declare that name twice, so the later parameter gets a suffix: `id_2` in Python, `$id2` in PHP, `id2` in Go.
A parameter named after an argument the method declares itself, such as `body` or `headers`, moves aside the same way.
The wire names never change, so both values reach the API as written, and the generator reports each rename.
To choose the names yourself, rename the parameter in the description.
The TypeScript client needs no rename, because each layer of its input is a separate object.

The generator resolves type and method **names** once, in the shared model.
It checks them against a reserved set that is the union across the supported languages.
Because of this, a schema keeps the same name in every SDK that you generate from the description.
For example, `Error` becomes `Error_2` in the Python SDK too, although Python accepts `Error`.
As a result, the TypeScript, Python, PHP, and Go clients of an API share one vocabulary.
The generator reports each rename with its cause.
A publisher who wants a different name can rename the schema or the operation in the description.

### Reference documentation

`client.docs: true`, or the `--docs` flag, also writes the reference documentation for what the run generates.
Each generator documents itself, and it writes one Markdown page next to its own output:

| Generator             | Page                     | Contents                                                                                               |
| --------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------ |
| `cli`                 | `<output>.cli.md`        | The usage line, the global flags, the credential variables, the exit codes, and every command.         |
| `typescript`          | `<output>.typescript.md` | The security schemes, and every operation with its parameters, body, response type, and a call sample. |
| `python`, `go`, `php` | `<output>.<language>.md` | The same page for that SDK, with its own call samples.                                                 |

```sh
redocly generate-client openapi.yaml --output src/client.ts --generator cli --generator python --docs
```

One switch covers every language, so a newly documented generator needs no new flag.
A generator that documents nothing, such as `zod`, writes no page.
Each page takes its call samples from the generator's own `sample` hook, so a page shows the syntax of the artifact beside it.
The CLI page renders from the same command table that the CLI dispatches on.
Because of this, a page cannot describe something other than what the run produced.

Set `client.docsFrontmatter: true` to put YAML front matter with the title above each page, for docs sites that expect it.
For a different structure or wording, [eject the generator](../commands/eject-generator.md) that owns the page.
The renderer is the template, so an ejected generator keeps writing its page and you own the layout.

## Package runtime

By default, the generator embeds the runtime in the generated file, so the client is self-contained.
With [`--runtime package`](../commands/generate-client.md#choose-a-runtime), the generated file imports the runtime from `@redocly/client-generator` instead.
Your application code is **identical in both modes**: the same exports and the same call shapes.
Only the location of the engine changes.
Select `package` to get engine fixes and improvements through `npm update @redocly/client-generator`, with no regeneration.

Install the runtime as a regular dependency and set the mode in `redocly.yaml`:

```sh
npm install @redocly/client-generator
```

```yaml
client:
  runtime: package # default: inline (self-contained)
```

If the generated file and the runtime are incompatible, your `tsc` build fails on the descriptor `satisfies` check.
The pair does not misbehave at runtime.
Package mode works with both output modes and every generator.
See the [`package-runtime` example](https://github.com/Redocly/redocly-cli/tree/main/tests/e2e/generate-client/examples/package-runtime).

## Run with Node directly

Node 22.7+ runs TypeScript natively with type stripping.
Because of this, you can run a script that uses the generated client with plain `node`, without `tsx` and without a build step.
Node resolves import specifiers literally, with no `.js` to `.ts` remap.
Because of this, generate with [`--import-ext ts`](../commands/generate-client.md#options) to get real on-disk `.ts` specifiers.
Import the client with a `.ts` extension in your own code:

```bash
redocly generate-client openapi.yaml -o src/api/client.ts --import-ext ts
```

```ts
// src/main.ts
import { listMenuItems } from './api/client.ts';

const menu = await listMenuItems({ query: { limit: 3 } });
```

```bash
node src/main.ts
```

Keep the default `js` when the client goes through `tsc` or a bundler.
Plain `tsc` rejects `.ts` specifiers unless the project enables `allowImportingTsExtensions`.
Loaders such as `tsx` remap `.js` to `.ts` themselves, so they work with the default.
See the [`node-native` example](https://github.com/Redocly/redocly-cli/tree/main/tests/e2e/generate-client/examples/node-native).

**Every generated TypeScript file is erasable TypeScript**, so type stripping alone is enough.
The client, the zod module, and the generated CLI all run under plain `node` with no build step.
No emitted code needs a transform to become JavaScript.
The output contains no `enum`, no `namespace`, and no constructor parameter properties (`constructor(readonly id: string)`).
Strip-only mode rejects these constructs, because it would have to generate assignments.

## Authentication

Credentials are **per instance**.
They live in the client config (`ClientConfig.auth`).
Each operation automatically sends the credentials that its `security` requires.
A description that declares no `securitySchemes` produces a client with no auth code.
Set credentials in one of two places, and both configure the same instance:

```ts
import { client, configure } from './client.ts';

// Up front, with the rest of the configuration.
configure({ auth: { bearer: process.env.API_TOKEN } });

// Or one scheme at a time, by kind.
client.auth.bearer(process.env.API_TOKEN);
client.auth.basic({ username: 'svc', password: 's3cr3t' });
client.auth.apiKey('SecretApiKey', process.env.API_KEY); // addressed by scheme key
```

| Scheme                         | How you set it                       | Applied as                               |
| ------------------------------ | ------------------------------------ | ---------------------------------------- |
| HTTP `bearer` / OAuth2         | `auth.bearer(token)`                 | `Authorization: Bearer <token>`          |
| HTTP `basic`                   | `auth.basic({ username, password })` | `Authorization: Basic <base64>`          |
| `apiKey` (header/query/cookie) | `auth.apiKey('<scheme key>', value)` | the named header, query param, or cookie |

Each operation sends only the credentials its own `security` requires, so setting several is normal.
An apiKey scheme is addressed by the key the description gives it, so an API with several apiKey schemes needs no extra names.
The runtime cannot inject `mutualTLS`.
Cookie apiKey credentials travel in the `Cookie` request header, and browsers refuse to set this header.
Because of this, cookie auth works only in server-side clients.
The generator warns when a spec declares a cookie scheme.
Bearer and apiKey credentials accept a **`TokenProvider`**: a string, or a function (possibly async) that the client calls for each request.
This is useful for refresh flows:

```ts
import { client } from './client.ts';

client.auth.bearer(async () => await getFreshAccessToken());
```

The client resolves the provider for each request, so a refreshed token takes effect without reconfiguration.

For **multiple independent instances** with different credentials, build extra clients from the same generated descriptors.
The generated module exports `createClient`, the `OPERATIONS` descriptors, and the `Ops` type in both runtimes:

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

Every operation takes one input object and an optional per-call `init`.
By default (`--args-style grouped`), the input groups its values by transport layer: `path`, `query`, `headers`, `cookies`, and `body`.
Each key is a sibling of the others, and the type of the whole object is the operation's `<Op>Variables`:

```ts
await updateOrder({
  path: { orderId: 'ord_01khr…' },
  query: { dryRun: true },
  headers: { 'X-Request-Id': requestId },
  body: { ...orderBody },
});
```

The layer names come from the description itself, so a call reads like the operation it calls, adding a parameter never changes how existing calls are written, and no name can collide with another.

With `--args-style flat`, the same values are merged into one level, which is shorter for an operation with a single kind of input:

```ts
await updateOrder({ orderId: 'ord_01khr…', dryRun: true, ...orderBody });
```

Flat merges the properties of a required object body.
A body that is optional, or that is not an object (an array, a scalar, or a binary payload), keeps its own `body` key.
When one name would arrive from two layers, that operation keeps the grouped shape, because a merged call could not say which value is which.

The client serializes cookie parameters into the `Cookie` request header, and browsers refuse to set this header.
Because of this, cookie parameters, like cookie apiKey auth, work only in server-side clients.

An unknown top-level key fails the call with a `TypeError` that names the key and lists the layers.
TypeScript catches this at compile time; the runtime check covers transpilers that skip type checks.
Because of this, a call with the wrong shape never drops data silently.

## Read-only properties

The server manages a property marked `readOnly: true`.
Because of this, the generated request body type leaves the property out.
A body that references a named schema becomes `Omit<Order, 'id' | 'createdAt'>`.
An inline object drops those properties.
Response types keep them.
The zod schemas and the mock factories read the same flag, so the type, the runtime validation, and the fixtures agree.

The position of `readOnly` matters, and it follows the specification version:

- **OpenAPI 3.1** uses JSON Schema 2020-12, where `$ref` is an ordinary keyword.
  Keywords next to a `$ref` take effect.
  Because of this, `{ $ref: './Entitlements.yaml', readOnly: true }` marks the property read-only.
- **OpenAPI 3.0 and 2.0** are older than that model.
  A `$ref` replaces the whole schema object, so a sibling `readOnly` has no meaning, and the generator ignores it.
  Generation warns when it finds a sibling `readOnly` and names the property.
  The intent is usually clear, and silence would keep the property in every request body.
  The [`spec-ref-siblings`](../rules/oas/spec-ref-siblings.md) rule flags the same thing when you lint.
  To mark a referenced property read-only in 3.0, inline the schema or wrap the `$ref` in an `allOf`.

## Error handling

By default (`--error-mode throw`), an operation throws `ApiError` on a non-2xx response.
It returns the success body directly.
With `--error-mode result`, the operation never throws for HTTP errors.
It returns a discriminated `Result<TData, TError>`.
The `error` type comes from the 4xx/5xx bodies in the description:

```ts
// throw (default)
try {
  const order = await getOrderById({ path: { orderId: 'ord_123' } });
} catch (err) {
  if (err instanceof ApiError) console.error(err.status, err.body);
}

// result
const { data, error, response } = await getOrderById({ path: { orderId: 'ord_123' } });
if (error) console.error(response.status, error.title);
else console.log(data.id);
```

Transport and abort failures still throw in both modes.
The choice is fixed at generate time.

## Middleware

The client has single `onRequest`/`onResponse`/`onError` hooks on `ClientConfig`.
It also takes **composable middleware** for concerns that apply to many calls: auth refresh, logs, traces, and request IDs.
Register middleware with `use()`, a shorthand for `client.use()`.
It accepts several middleware at once:

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

`onRequest` hooks run in registration order.
`onResponse` hooks run in reverse order.
`onRequest` can change `ctx`: `url`, `method`, `headers`, and `body`.
The client serializes and sends body edits.
`onResponse` can return a replacement `Response`.
The client threads `onError` (throw mode only) through each middleware.
The fields of `ctx.operation` are typed as literal unions from the description (`OperationId`/`OperationPath`/`OperationTag`).
Because of this, `ctx.operation.id === '…'` and `ctx.operation.tags.includes('…')` autocomplete.
An operation id with a spelling error fails compilation, and it does not silently miss all matches.
To set a header for a single call, use the trailing `init` argument of that operation.
Per-request headers merge from the lowest to the highest priority, and the caller always wins:

1. Injected auth credentials.
2. Typed header parameters.
3. The caller's `init.headers`.

Outside browsers, the client also identifies itself to the API with an `X-Redocly-Client` header.
The API owner can use this header for telemetry.
Override the header with `configure({ clientHeader: 'my-service/2.0' })`.
Disable it with `clientHeader: false`.
Browsers never send it, because a custom header would force a CORS preflight.

`use()` appends to the middleware chain.
It composes with middleware that is already registered or that the publisher pre-configured.
`configure({ middleware: [...] })` replaces the whole chain.
Use it to reset the chain.
But prefer `use()` to add to existing middleware, including [publisher pre-configured](./customize-client-generation.md#publisher-defaults) middleware.

See the [`configure-and-middleware` example](https://github.com/Redocly/redocly-cli/tree/main/tests/e2e/generate-client/examples/configure-and-middleware) for a runnable version.

## The HTTP layer

The client sends requests with `fetch`, and that is the only transport it needs.
Auth, retries, timeouts, and middleware are part of the client, so you do not add a request library to get them.

If your application already has a configured HTTP layer, pass it to the client instead of replacing what you have.
`ClientConfig.fetch` accepts anything with the `fetch` signature, so an existing instance of your request library goes in through one adapter function:

```ts
import axios from 'axios';
import { configure } from './client.ts';

// One adapter, and every generated call goes through your instance:
// its interceptors, its base configuration, its telemetry.
configure({
  fetch: async (input, init) => {
    const response = await axios.request({
      url: typeof input === 'string' ? input : input.toString(),
      method: init?.method ?? 'GET',
      headers: init?.headers as Record<string, string>,
      data: init?.body,
      responseType: 'text',
      validateStatus: () => true,
    });
    return new Response(response.data, {
      status: response.status,
      headers: response.headers as HeadersInit,
    });
  },
});
```

The same seam takes a test double, a proxy-aware fetch, or a `fetch` that adds tracing headers.
Prefer [middleware](#middleware) for behavior that belongs to your API, and keep `fetch` for the transport itself.

## Retries

Retry is **opt-in**.
Configure it through `ClientConfig`, with an optional per-call override:

```ts
configure({ retry: { retries: 3 } }); // the module's client instance
const other = createClient<Ops>(OPERATIONS, { retry: { retries: 3 } }); // another instance
await getOrderById({ path: { orderId: 'ord_123' } }, { retry: { retries: 5 } }); // per call
```

By default, the client retries only **idempotent** methods (`GET`, `HEAD`, `PUT`, `DELETE`, `OPTIONS`).
It retries them on a network error or a transient status (`408`, `429`, `500`, `502`, `503`, `504`).
The client does not retry `POST`/`PATCH`, because a repeated send can duplicate side effects.
Opt in with a custom `retryOn` when a retry is safe.

A custom `retryOn` **replaces** the whole default policy.
A predicate like `({ response }) => (response?.status ?? 0) >= 500` silently stops retries for network errors and timeouts, because these have no `response`.
Compose with the exported default instead: `retryOn: (ctx) => defaultRetryOn(ctx) || myRule(ctx)`.

For APIs that support [idempotency keys](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/), set `idempotencyKey: true` (or a key factory) on the instance.
Then every `POST`/`PATCH` gets an `Idempotency-Key` header.
The key is one stable value per logical call, and each retry attempt sends the same value.
The default retry policy then treats those requests as safe to retry.
Per call, pass a literal key (`{ idempotencyKey: 'order-42-submit' }`), or pass `false` to skip the header.
An `Idempotency-Key` header set by the caller always wins.
Backoff is exponential with full jitter.
Set `retryStrategy: 'fixed'` for a constant delay.
A `Retry-After` header takes precedence.
An aborted `AbortSignal` stops retries immediately.

A `timeout` (milliseconds) aborts an attempt that takes too long, including the body read.
The timeout composes with your own `AbortSignal`.
Each retry attempt gets a fresh time budget.
An attempt that times out retries under the same policy as a network error.
When no retries remain, the failure surfaces as a `TimeoutError`, exported next to `ApiError`.
The error carries the `operationId`, the effective `timeout`, and the `attempt` number.
This is everything a log line needs.
Set the timeout on the instance (`configure({ timeout: 10_000 })`) or per call (`{ timeout: 500 }`).
A per-call value of `0` disables the instance default.
SSE streams stay open by design and never inherit the instance timeout.

A retry **resends the same request**.
The `onRequest` chain, `config.headers()`, and body serialization run once, and all attempts reuse the result.
To refresh a token, a signature, or a timestamp for each attempt, do it in `onResponse`/`onError` or in a custom `retryOn`.
Do not expect `onRequest` to run again.

| `RetryConfig` field | Type                                                 | Default                                            |
| ------------------- | ---------------------------------------------------- | -------------------------------------------------- |
| `retries`           | `number`                                             | `0` (extra attempts after the first; `0` disables) |
| `retryDelay`        | `number`                                             | `1000` (base delay, ms)                            |
| `retryStrategy`     | `'fixed' \| 'exponential'`                           | `'exponential'`                                    |
| `jitter`            | `boolean`                                            | `true`                                             |
| `retryOn`           | `(ctx: RetryContext) => boolean \| Promise<boolean>` | idempotent-only predicate                          |

A custom `retryOn` receives the `RetryContext` of the failed attempt: `attempt`, `request`, and exactly one of `response` / `error`.
It **fully replaces** the default.
To examine a response body, read `ctx.response.clone()`, because the body is a single-use stream:

```ts
await createOrder(
  { body },
  {
    retry: {
      retries: 3,
      retryOn: async (ctx) => {
        if (ctx.error) return true; // transport error
        return (ctx.response?.status ?? 0) >= 500; // server error
      },
    },
  }
);
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

Delimiters are literal.
The client still percent-encodes the values.
`allowReserved: true` keeps the RFC-3986 reserved set un-encoded.
Parameters with object values serialize as `deepObject` brackets (`key[sub]=val`).

## Multipart uploads

A `multipart/form-data` body whose schema is an **object** generates as a typed object.
Pass a plain object, and the client serializes it to `FormData`.
The serialization happens after the `onRequest` chain, so middleware can change the object.
Binary fields (`format: binary`) are typed as `Blob`:

```ts
// type UploadBody = { file: Blob; orgId: string; tags?: string[] };
await upload({ file, orgId: 'org_1', tags: ['a', 'b'] });
```

`Blob` values and strings pass through unchanged.
Arrays append one field per item.
The client JSON-encodes nested objects and skips `undefined`/`null`.
A multipart body whose schema is not a concrete object keeps the raw `FormData` type.
`format: byte` (base64) stays a `string`.

## Response decoding

The client selects a reader for each response from its `Content-Type`: JSON, then `text/*`, then `Blob`.
Force a reader per call with `parseAs`:

```ts
const res = await getMenuItemPhoto('prd_123', { parseAs: 'stream' });
```

`parseAs` accepts `'json'`, `'text'`, `'blob'`, `'arrayBuffer'`, `'formData'`, `'stream'`, or `'auto'` (default).
It changes the runtime reader only, not the static return type.

An operation whose success response declares no content is typed `void`.
But if the server sends a JSON body anyway (a gap in the API description), the runtime still parses and returns the body.
It does not drop real data silently.
Access the body with a cast until the description declares it.

## Response headers (envelope)

By default, throw mode returns only the parsed success body.
Sometimes you need response headers, for example pagination totals, rate limits, or `Location`.
To get them without a switch to `--error-mode result`, pass `{ envelope: true }` on that call:

```ts
// The inputs come first, the per-call options second.
const { data, headers, response } = await listCustomers(
  { query: { limit: 1 } },
  { envelope: true }
);

headers.paginationTotal; // number — required Pagination-Total in the description
headers.xFlag; // boolean | undefined — optional X-Flag
response.headers.get('X-Undocumented'); // anything not declared in OpenAPI

// The instance client is the same function under another name.
const envelope = await client.listCustomers({ query: { limit: 1 } }, { envelope: true });
```

- `headers` is a safe camelCase object of the headers declared on the operation's success response.
  String, number, and boolean schemas drive the TypeScript type and the number/boolean coercion.
  Complex header schemas stay strings, because HTTP exposes header values as text.
  Required response headers are required properties.
  The type trusts the API description, the same as the response body types do.
  Normalized names that collide get a deterministic numeric suffix.
- `response` is the raw `Response`.
  Use it for undocumented headers.
- Non-2xx responses still throw `ApiError`.
- Default call sites continue to return only the body, so the flag is non-breaking.
  This includes calls that pass other options (`headers`, `signal`, `parseAs`, a retry override).
- In `--error-mode result`, the client ignores the flag.
  That mode already returns `response`.
- The TanStack Query and SWR wrappers do not accept `envelope`.
  Their options exclude it, and the wrappers strip it from the forwarded call.
  Because of this, cached data is always the plain body.
  Call the client's operation function directly when you need headers.
- The Python, PHP, and Go SDKs expose the same information as separate variants: `<op>_with_headers()`, `<op>WithHeaders()`, and `<Op>WithHeaders`.
  The generator emits these variants only for operations that declare success-response headers.
  Those languages cannot change a return type with a flag.

## Runtime validation

The `zod` generator emits `operationSchemas`, a set of request and response validators keyed by operationId.
It also emits the `zodValidation` middleware that connects them to the client:

```ts
import { use } from './api/client';
import { zodValidation } from './api/client.zod';

use(zodValidation()); // validate request bodies and JSON responses
```

The two directions have different defaults, because they catch bugs from different parties:

- An invalid **request** body throws `ZodValidationError` before a network call.
  This is the caller's own bug, caught at the least expensive moment.
- A successful JSON **response** that does not match its schema **warns by default** and lets the call succeed.
  The warning goes to `console.warn` or to a custom `onViolation` callback.
  A server that does not match its description must not crash the consumer.
  Pass `response: 'throw'` for the strict behavior; it then throws even on result-mode clients.
  Pass `response: false` to skip response validation.

`ZodValidationError` carries the `operationId`, the `direction`, the raw zod `issues`, and the flattened `violations`.
Each violation has the full nested path (union branches included) and a truncated preview of the bad value.
Because of this, you can identify the failing field without a reproduction of the payload.
Note that previews can show payload data.
Point `onViolation` at a scrubbed logger when responses can carry secrets.

Some servers reject properties that the schema does not declare.
For those servers, set `stripRequestBodies: true`.
It replaces the outgoing body with the parsed result and drops each key that the schema does not declare.
A spread like `{ ...entity }` compiles past TypeScript's excess-property check, but without this option it reaches the wire unchanged.
Operations without a JSON body pass through unchanged.
The middleware never changes a payload unless you set `stripRequestBodies`.
Pass `{ request: false }` to narrow the scope.
Or import a schema from `operationSchemas` for a single check.

## Operation metadata

The client exports an `OPERATIONS` map keyed by operationId.
These are the same **operation descriptors** that the runtime uses to route requests.
Each descriptor holds the operation's `method`, `path` template, `tags`, and wire shape:

```ts
export const OPERATIONS = {
  getOrderById: { id: 'getOrderById', method: 'GET', path: '/orders/{orderId}', tags: ['Orders'] },
  // …
} as const satisfies Record<string, OperationDescriptor>;
```

The keys and values are plain string literals, so they survive bundlers and minifiers.
Because of this, `OPERATIONS` is the stable handle for cache keys, span names, or log labels.
Do not use `fn.name`, because a minifier can rename it.
Every client method also carries its own identity as `client.getOrderById.operationId`.
This is an explicit cache key for consumer wrappers (react-query keys and the like), and a minifier cannot break it.
The same `OperationId` / `OperationPath` / `OperationTag` unions type `ctx.operation` in middleware.

## Discriminated unions

A `oneOf` / `anyOf` with a usable discriminator gets an exported `is<Member>` type guard for each member.
The discriminator comes from the description's `discriminator`.
The generator can also infer it when every member sets a shared property to a distinct string `const`:

```ts
export type MenuItem = Beverage | Dessert;
export function isBeverage(value: MenuItem): value is Beverage { … }
```

The generator also emits guards for unions nested inside another schema (array items, property values), if every member is a named schema.
A union without a usable discriminator gets no guard.

## Server-Sent Events

An operation whose `2xx` response declares `text/event-stream` generates as a typed **async-generator function**.
The client method is exported under its own name, like every other operation.
No flag is required.
The `data` of each event is typed from the OpenAPI 3.2 `itemSchema`.
If `itemSchema` is absent, the type falls back to the media `schema`, then to `string`.
The client applies `JSON.parse` to structured data:

```ts
import { streamMessages } from './client.ts';

for await (const ev of streamMessages()) {
  console.log(ev.id, ev.data.text); // ServerSentEvent<T>: { event?, data, id?, retry? }
}
```

The stream **reconnects automatically** after a dropped connection.
It resumes from the last event id with `Last-Event-ID`.
The backoff uses the server's `retry:`, then `reconnectDelay`, then 1 second, with a cap of 30 seconds.
Tune per call with the second argument: `streamMessages({}, { reconnect: false })` or `{ reconnectDelay: 500 }`.
A `break` from the loop, or an aborted `AbortSignal`, ends the stream cleanly with no throw.
SSE always throws `ApiError` on a non-2xx initial response, regardless of `--error-mode`.

## Pagination

Pagination is declared, never guessed.
Describe how your API paginates in `redocly.yaml` under `client.pagination`.
Or declare it per operation with the `x-redoclyPagination` extension in the description.
The [`client.pagination` reference](../configuration/reference/client.md#pagination-object) documents the rule fields and the verification at generate time.
It also documents the precedence between the convention, `x-redoclyPagination`, and per-operation overrides.
There is no CLI flag.
Each paginated operation keeps its one-shot call and gains two async iterators.
`.pages(args?, init?)` yields full pages, and `.items(args?, init?)` yields individual items.
Both are typed statically from the response schema.

The client supports four styles.
`cursor` sends the response's `nextCursor` back in `cursorParam`.
It stops when the cursor is absent, `null`, or empty.
It throws if the server returns the same cursor two times in a row.
Some connection-style APIs keep a non-null cursor on the last page.
For those, add the optional `hasMore` pointer (for example `/pageInfo/hasNextPage`).
Iteration stops as soon as the pointer resolves to `false`, and the client skips the empty follow-up request.

`offset` advances `offsetParam` by the item count of each page.
`page` increments `offsetParam` by 1.
Both stop on an empty page.

`link` follows the `rel="next"` target in the response's RFC 8288 `Link` header (the GitHub pattern).
There is no advance parameter.
The runtime merges the target's query parameters into the next call.
Because of this, every page goes through the same declared endpoint: auth and middleware apply unchanged, and the client never gives credentials to a cross-origin URL.
Iteration stops when no `rel="next"` is present, and it throws if the target repeats.
A `link` convention rule applies only to operations whose success response documents a `Link` header.
An explicit rule applies in all cases, but it warns when the header is undocumented.

`limitParam` is optional metadata for any style.
The iterator never sets it, so pass your page size in `params` yourself.

```ts
import { client } from './client.ts';

for await (const order of client.listOrders.items({ query: { limit: 20 } })) {
  console.log(order.id); // `order` is `Order` — resolved from the response schema at generate time
}

for await (const page of client.listOrders.pages()) {
  console.log(page.orders.length); // each full page, last one included
}
```

`listOrders` and `listOrders.pages` are the same function and its own member, so they take the same input in either argument style.

To resume, pass the advance parameter in the initial args.
Iteration then starts from that point, not from the beginning.
To abort, pass an `AbortSignal`.
The client forwards it to every page request:

```ts
const controller = new AbortController();
for await (const page of client.listOrders.pages(
  { query: { cursor: 'c2' } }, // start from a saved cursor (or offset/page number)
  { signal: controller.signal }
)) {
  // …
}
```

A failed page always stops iteration with a thrown `ApiError`, even on an `--error-mode result` client.
On a result-mode client, `.pages()` yields raw pages, not `{ data, error, response }` envelopes.
Only the one-shot call keeps the envelope.
The client also does not invoke the `onError` middleware hook, which is throw-mode only.

The built-in styles do not cover every shape, for example a cursor that travels in the request body or in a header.
For those shapes, write a small helper over the generated call.
The helper stays fully typed from end to end.
See the [`custom-pagination` example](https://github.com/Redocly/redocly-cli/tree/main/tests/e2e/generate-client/examples/custom-pagination).

## TanStack Query factories

The `tanstack-query` generator emits typed TanStack Query v5 factories for each operation:

- `<op>Options(vars, init?)` for each query (GET/HEAD).
  Pass it to `useQuery`/`prefetchQuery`.
  Its `queryFn` forwards TanStack's abort `signal` into the request.
  Because of this, an unmounted or superseded query cancels its network call.
- `<op>InfiniteOptions(vars, init?)` for each **paginated** query.
  Pass it to `useInfiniteQuery`/`fetchInfiniteQuery`.
  The generator compiles the `initialPageParam`/`getNextPageParam` pair from the same [pagination](#pagination) rule that powers `.pages()`/`.items()`, and it includes the `hasMore` stop.
  Because of this, infinite queries need no hand-written `getNextPageParam`.
  `link`-style operations are the exception, because their next page lives in a response header that a `queryFn` cannot see.
  Use the client's `.pages()`/`.items()` iterators for those.
- `<op>QueryKey(vars?)`.
  With `vars`, it returns the exact key that the options use.
  **Without arguments, it returns the invalidation prefix** that matches every cached page and filter of the operation: `queryClient.invalidateQueries({ queryKey: listOrdersQueryKey() })`.
- `<op>Mutation(init?)` for each mutation.
  Per-call `RequestOptions` (headers, a retry override) reach the mutation's requests.

The module-level factories bind the generated module's default `client`.
For an isolated instance with its own credentials, middleware, and retry, build a bound set with `createQueryFactories`:

```ts
import { createClient } from '@redocly/client-generator';
import { OPERATIONS, type Ops } from './api/client';
import { createQueryFactories } from './api/client.tanstack';

const internal = createQueryFactories(
  createClient<Ops>(OPERATIONS, { auth: { basic: { username: 'svc', password: 's3cr3t' } } })
);
useQuery(internal.getOrderOptions({ orderId }));
```

When several generated APIs share one `QueryClient`, their operationIds can collide.
For example, two APIs with a `check` operation would mix caches.
Set `queryKeyPrefix` in the `client` block to add a namespace to every key.
For example, `queryKeyPrefix: main` makes the keys `['main', 'check', vars]`.

## Format and lint the generated files

The generator prints one canonical style: the TypeScript compiler's printer, with a four-space indent and double quotes.
If your project's formatter enforces a different style, its check fails on newly generated files.
Run your formatter over the output immediately after generation, for example as the next step in the same script.
Or add the generated paths to your formatter's ignore list.
Generated files are not edited by hand, so a reformat is churn without review value.

Linting is different.
The generated code must pass strict lint configurations unchanged: no `any`, no non-null assertions, and no unused imports.
If your linter flags generated output, [report it](https://github.com/Redocly/redocly-cli/issues).
That is a generator bug, not a style choice.

## Resources

- **[`generate-client` command](../commands/generate-client.md)** — Learn about the the `generate-client` command's flags, output modes, and invocation
- **[`client` configuration](../configuration/reference/client.md)** — Explore the settings for the `generate-client` command
- **[Customize client generation](./customize-client-generation.md)** — Learn how to control the output of the `generate-client`
- **[Move an app to a generated client](./migrate-to-generated-client.md)** — Replace a hand-written client, one call site at a time
