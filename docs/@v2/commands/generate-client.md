# `generate-client`

{% admonition type="warning" name="Experimental" %}
`generate-client` is an experimental feature.
Its flags, generated output, configuration schema, and custom-generator API can change in any minor release until the feature is stable.
Send us your feedback while we stabilize the feature.
{% /admonition %}

## Quickstart

Point the command at a description and give it an output path:

```bash
redocly generate-client openapi.yaml --output src/client.ts
```

That writes one self-contained file with a typed function for each operation:

```ts
import { listOrders, createOrder, configure } from './client.js';

configure({ auth: { bearer: process.env.API_TOKEN } });

const orders = await listOrders({ query: { status: 'open', limit: 10 } });
const created = await createOrder({ body: { items: [{ menuItemId: 'itm_1', quantity: 2 }] } });
```

The client has no dependencies, and it carries the behavior an API needs: auth for every scheme the description declares, opt-in retries, timeouts, middleware, pagination iterators, and typed server-sent events.
Add a flag for each extra artifact you want:

```bash
redocly generate-client openapi.yaml -o src/client.ts \
  --generator zod --generator tanstack-query --generator mock --docs
```

The rest of this page describes the flags.
[Use the generated client](../guides/use-generated-client.md) describes what the output does.

## Introduction

The `generate-client` command generates API clients from an OpenAPI description:

- A typed TypeScript client (the default).
- Add-on modules for the TypeScript client, for example Zod schemas, TanStack Query factories, and MSW mocks.
- A command-line interface.
- SDKs for Python, Go, PHP, and Java.

For the full list, see [Generators](../guides/use-generated-client.md#generators).

The TypeScript client has no dependencies.
It uses only web-standard APIs (`fetch`, `AbortController`, `URLSearchParams`), so it runs in browsers, Node, Bun, Deno, and edge runtimes.

To use the generated code (auth, errors, middleware, retries), see [Use the generated client](../guides/use-generated-client.md).

## Usage

```bash
redocly generate-client
redocly generate-client <api>
redocly generate-client <api> [--output=<path>] [--output-mode=<mode>] [--runtime=<mode>]
redocly generate-client <api> [--generator=<name>] [--args-style=<style>] [--error-mode=<mode>]
redocly generate-client <api> [--config=<path>]
redocly generate-client [--help]
```

## Options

| Option           | Type     | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ---------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `api`            | string   | The file path to the OpenAPI description, a URL, or an `apis:` alias. Omit it to generate a client for each api that has a `client` block or `clientOutput`.                                                                                                                                                                                                                                                                                                       |
| `--output`, `-o` | string   | The path of the generated client, with the `.ts` extension, for example `src/client.ts`. The `python`, `go`, `php`, and `java` SDKs use the same path with their own extension, for example `src/client.go` (Java names the file after its class: `src/Client.java`). If the output has more than one file, this is the main file. Use this option only for one API. Default: the `clientOutput` of the api, or `<name>.client.ts` next to the configuration file. |
| `--output-mode`  | string   | The file layout. See [Choose an output mode](#choose-an-output-mode). <br/> **Possible values:** `single`, `split`. Default: `single`.                                                                                                                                                                                                                                                                                                                             |
| `--runtime`      | string   | The location of the client engine. <br/> **Possible values:** `inline`, `module`. Default: `inline`.                                                                                                                                                                                                                                                                                                                                                               |
| `--import-ext`   | string   | The extension in the generated relative imports. See [Run with Node directly](../guides/use-generated-client.md#run-with-node-directly). <br/> **Possible values:** `js` (the tsc/bundler convention), `ts` (for Node's built-in type stripping). Default: `js`.                                                                                                                                                                                                   |
| `--generator`    | [string] | The generator to run: a built-in name, or the path or package of a custom generator. Repeat the flag to run more than one generator. Default value is `typescript`. See [Generators](../guides/use-generated-client.md#generators) for the full list.                                                                                                                                                                                                              |
| `--args-style`   | string   | Sets how you pass inputs to operations. See [Argument style](../guides/use-generated-client.md#argument-style). <br/> **Possible values:** `grouped`, `flat`. Default: `grouped`.                                                                                                                                                                                                                                                                                  |
| `--error-mode`   | string   | Sets how operations report HTTP errors. See [Error handling](../guides/use-generated-client.md#error-handling). <br/> **Possible values:** `throw`, `result`. Default: `throw`.                                                                                                                                                                                                                                                                                    |
| `--date-type`    | string   | The type of the `date`/`date-time` fields. If you use `Date`, also use the `transformers` generator. <br/> **Possible values:** `string`, `Date`. Default: `string`.                                                                                                                                                                                                                                                                                               |
| `--mock-data`    | string   | The data mode for the `mock` generator. <br/> **Possible values:** `static` (deterministic literals), `faker` (`@faker-js/faker` calls). Default: `static`.                                                                                                                                                                                                                                                                                                        |
| `--mock-seed`    | number   | The seed for `faker`-mode mocks. Use it to get reproducible data. The command ignores it in `static` mode.                                                                                                                                                                                                                                                                                                                                                         |
| `--server-url`   | string   | Overrides the default server URL in the client. The option accepts an absolute URL (`https://api.example.com`) or a relative URL (`/v1`). Defaults to `servers[0].url`. The app can also change the server URL at runtime with `createClient({ serverUrl })` or `configure({ serverUrl })`. See [Authentication](../guides/use-generated-client.md#authentication) in the usage guide.                                                                             |
| `--setup`        | string   | The path to a publisher setup module that the command includes in the client. Use it to pre-configure defaults, for example the server URL, retries, headers, and middleware. A published SDK then contains these defaults. See [Publisher defaults](../guides/customize-client-generation.md#publisher-defaults).                                                                                                                                                 |
| `--docs`         | boolean  | Also write the reference documentation for what this run generates: one Markdown page for each selected generator that documents itself (the CLI, and each SDK). Default value is `false`.                                                                                                                                                                                                                                                                         |
| `--go-package`   | string   | The package clause in the output of the `go` generator. It must be a valid Go package name (lowercase letters, digits, and `_`; it must not start with a digit or be a keyword). Default value is `client`.                                                                                                                                                                                                                                                        |
| `--config`       | string   | Specify the path to the [configuration file](#generate-from-the-configuration-file).                                                                                                                                                                                                                                                                                                                                                                               |
| `--help`         | boolean  | Display help.                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

## Examples

### Generate from the configuration file

You do not have to pass flags each time.
Keep the settings in `redocly.yaml` under a top-level `client` block and per-API `apis.<name>.client` / `clientOutput`.
See the [`client` configuration reference](../configuration/reference/client.md) for the fields.
CLI flags take precedence over the configuration.
Auto-pagination has no CLI flag.
Declare it only as the [`client.pagination`](../configuration/reference/client.md#pagination-object) configuration or the `x-redoclyPagination` operation extension.

```yaml
client:
  generators:
    - typescript
apis:
  cafe:
    root: ./openapi.yaml
    clientOutput: ./src/api/client.ts
```

```bash
redocly generate-client            # every api with a `client` block or `clientOutput`
redocly generate-client cafe       # just the `cafe` api
```

### Generate from a file path or URL

An unmatched path or URL uses the top-level `client` defaults.
The `--output` flag names the entry file:

```bash
redocly generate-client openapi.yaml --output dist/client.ts
```

### Choose an output mode

The `--output-mode` flag controls how the command splits the client into files:

- `single` (default): the command writes one file.
  The file is self-contained with the default `inline` runtime.
- `split`: the command writes two files.
  It puts the schema types and the type guards in a sibling file, `<name>.schemas.ts`. The entry file re-exports them.
  Because of this, your imports are the same as in `single`.

```bash
redocly generate-client openapi.yaml -o src/api/client.ts --output-mode split
```

### Choose a runtime

The `--runtime` flag controls where the client engine lives:

- `inline` (default): the engine is embedded in the generated file, so the client is one self-contained file.
- `module`: the command writes the engine as real files in a `runtime/` folder beside the client, and the client imports them relatively.
  Several generated clients in one repository can share one `runtime/` folder, and you can read the engine as ordinary source files.
  The files are still machine-owned: the command regenerates them on every run.

Every generator that embeds an engine supports both modes, each in its language's shape:

- `typescript` and `cli` write `runtime/*.ts` modules.
- `python` writes the `_*.py` runtime modules beside the client, which imports them.
- `go` writes a `runtime.go` file in the same package as the client.
- `php` writes a `runtime.php` file that the client loads with `require_once`.
- `java` writes a `<Class>Runtime.java` base class that the client extends.

```bash
redocly generate-client openapi.yaml -o src/api/client.ts --runtime module
```

### Add usage telemetry

Set `telemetry: on` in the `client` block of your `redocly.yaml` file:

```yaml
client:
  telemetry: on
```

Each language generator then also writes a telemetry module next to the client:

| Generator    | File                    |
| ------------ | ----------------------- |
| `typescript` | `<output>.telemetry.ts` |
| `go`         | `telemetry.go`          |
| `python`     | `<module>_telemetry.py` |
| `php`        | `telemetry.php`         |

The module counts the calls of your SDK per operation and sends the counts once a minute.
Use it to learn which operations your SDK users call, how often, with which outcome, and how fast.
Without `telemetry: on`, the generated code contains no telemetry, and the client file is the same in both cases.
This option is available only in the configuration file and has no flag.

Register the module once, where your SDK creates its client.
The module counts each call once, after the last retry.

{% tabs %}
{% tab label="TypeScript" %}

```ts
import { telemetry } from './client.telemetry.ts';
import { use } from './client.ts';

use(
  telemetry({ sdkName: '@acme/billing-sdk', sdkVersion: '3.2.0', client: 'invoice-worker/1.8.4' })
);
```

The middleware sends the open window when Node.js emits `beforeExit`.
Before `process.exit()` or on a signal, call `await flush()`.

{% /tab %}
{% tab label="Go" %}

```go
telemetry := client.NewUsageTelemetry(client.UsageTelemetryOptions{
    SDKName:    "github.com/acme/billing-sdk",
    SDKVersion: "3.2.0",
    Client:     "invoice-worker/1.8.4",
})
defer telemetry.Flush(context.Background())
api := client.New(client.Config{Middleware: []client.Middleware{telemetry.Middleware()}})
```

Go has no exit hook, so call `Flush(ctx)` before your program ends.

{% /tab %}
{% tab label="Python" %}

```python
from billing_client import Client
from billing_client_telemetry import telemetry

api = Client(middleware=[telemetry(sdk_name="acme-billing", sdk_version="3.2.0", client="invoice-worker/1.8.4")])
```

The module sends the open window when the interpreter exits.
Before `os._exit()` or on a signal, call `flush()`.

{% /tab %}
{% tab label="PHP" %}

```php
require __DIR__ . '/telemetry.php';

$telemetry = new UsageTelemetry(sdkName: 'acme/billing-sdk', sdkVersion: '3.2.0', client: 'invoice-worker/1.8.4');
$api = new Client(new Config(onSettled: [$telemetry]));
```

PHP has no timers.
A call that finds its window elapsed sends that window first, in the same request.
At shutdown, the module sends the open window, which can add up to 3 seconds to the end of a request.
Call `$telemetry->flush()` to send it earlier.

{% /tab %}
{% /tabs %}

The window is 60 seconds by default.
By default, the events go to the Redocly OpenTelemetry endpoint.
Set `endpoint` to send them to another OTLP/HTTP traces URL, for example a local collector.
Pass a `sink` function to receive the events yourself instead.

If the connection fails or the endpoint answers `408`, `429`, or `5xx`, the middleware adds the counts to the next window.
After a timeout or any other failed send, it drops the counts.

Each event contains only:

- The operation ID.
- The number of calls and attempts, and the sum of their durations.
- The calls per outcome (`2xx`, `3xx`, `4xx`, `5xx`, `network_error`, `timeout`, `aborted`) and the calls per duration bucket.
  An outcome or a bucket with no calls is not sent.
- The window start and length.
- The SDK name and version, the generator version, the language, and the runtime name and version.
  The runtime is Node.js, Bun, or Deno for TypeScript, and the Python implementation, such as CPython, for Python.
  For Go and PHP, the runtime is the language.
- The client name that you pass.

The module never sends URLs, path or query parameters, headers, request or response bodies, or any other value from a request.

To turn off sending at run time, set `REDOCLY_SDK_TELEMETRY=off` or `DO_NOT_TRACK=1`.
In a browser, the middleware does nothing.

## Resources

- **[Use the generated client](../guides/use-generated-client.md)** - Learn how to use the client produced by the `generate-client` command
- **[Move an app to a generated client](../guides/migrate-to-generated-client.md)** - Replace a hand-written client, one call site at a time
- **[`client` configuration](../configuration/reference/client.md)** - Explore the settings for the `generate-client` command
- **[Lint command](./lint.md)** - Validate your API description before you generate a client
- **[Bundle command](./bundle.md)** - Combine a multi-file description into one input file
