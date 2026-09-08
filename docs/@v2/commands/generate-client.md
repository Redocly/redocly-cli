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

The `generate-client` command generates a typed TypeScript client from an OpenAPI 3.x description.
The command also accepts Swagger 2.0 descriptions and normalizes them to the 3.x shape before generation.
The command validates the description first.
If the description has unresolved `$ref`s or structural errors, the command stops the generation and lists the problems.
This validation does not depend on your lint configuration.

By default, the generated client has zero runtime dependencies.
The client uses only web-standard APIs (`fetch`, `AbortController`, `URLSearchParams`).
Because of this, the client runs in browsers, Node, Bun, Deno, and edge runtimes.
By default, the command writes one self-contained file with inline types and one async function for each operation.

The `<api>` argument is a file path, a URL, or an [`apis:` alias](../configuration/index.md).
The command resolves the argument in the same way as other commands, for example `bundle` and `lint`.
An alias, or a path that matches the `root` of an api, uses the `client` block and the `clientOutput` of that api.
An unmatched path or URL uses the top-level `client` defaults.
If you give no argument, the command generates a client for each api that declares a `client` block or a `clientOutput` (see [`client` configuration](../configuration/reference/client.md)).

This page tells you how to run the command.
For the runtime API of the generated client (auth, error handling, middleware, retries, and the add-on generators), see [Use the generated client](../guides/use-generated-client.md).

## Usage

```bash
redocly generate-client
redocly generate-client <api>
redocly generate-client <api> [--output=<path>] [--output-mode=<mode>] [--runtime=<mode>]
redocly generate-client <api> [--generator=<name>] [--args-style=<style>] [--error-mode=<mode>]
redocly generate-client <api> [--config=<path>]
redocly generate-client [--help] [--version]
```

## Options

| Option           | Type     | Description                                                                                                                                                                                                                                                                                                                                                                            |
| ---------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `api`            | string   | The file path to the OpenAPI description, a URL, or an `apis:` alias. Omit it to generate a client for each api that has a `client` block or `clientOutput`.                                                                                                                                                                                                                           |
| `--output`, `-o` | string   | The output path (it must end in `.ts`). In multi-file modes, this is the entry file. Defaults to the `clientOutput` of the api, else `<name>.client.ts` next to the configuration file. Use this option only when you generate one API.                                                                                                                                                |
| `--output-mode`  | string   | The file layout. See [Choose an output mode](#choose-an-output-mode). <br/> **Possible values:** `single`, `split`. Default: `single`.                                                                                                                                                                                                                                                 |
| `--runtime`      | string   | The location of the client engine. <br/> **Possible values:** `inline`, `module`. Default: `inline`.                                                                                                                                                                                                                                                                                   |
| `--import-ext`   | string   | The extension in the generated relative imports. See [Run with Node directly](../guides/use-generated-client.md#run-with-node-directly). <br/> **Possible values:** `js` (the tsc/bundler convention), `ts` (for Node's built-in type stripping). Default: `js`.                                                                                                                       |
| `--generator`    | [string] | The generator to run: a built-in name, or the path or package of a custom generator. Repeat the flag to run more than one generator. Default value is `typescript`. See [Generators](../guides/use-generated-client.md#generators) for the full list.                                                                                                                                  |
| `--args-style`   | string   | Sets how you pass inputs to operations. See [Argument style](../guides/use-generated-client.md#argument-style). <br/> **Possible values:** `grouped`, `flat`. Default: `grouped`.                                                                                                                                                                                                      |
| `--error-mode`   | string   | Sets how operations report HTTP errors. See [Error handling](../guides/use-generated-client.md#error-handling). <br/> **Possible values:** `throw`, `result`. Default: `throw`.                                                                                                                                                                                                        |
| `--date-type`    | string   | The type of the `date`/`date-time` fields. If you use `Date`, also use the `transformers` generator. <br/> **Possible values:** `string`, `Date`. Default: `string`.                                                                                                                                                                                                                   |
| `--mock-data`    | string   | The data mode for the `mock` generator. <br/> **Possible values:** `static` (deterministic literals), `faker` (`@faker-js/faker` calls). Default: `static`.                                                                                                                                                                                                                            |
| `--mock-seed`    | number   | The seed for `faker`-mode mocks. Use it to get reproducible data. The command ignores it in `static` mode.                                                                                                                                                                                                                                                                             |
| `--server-url`   | string   | Overrides the default server URL in the client. The option accepts an absolute URL (`https://api.example.com`) or a relative URL (`/v1`). Defaults to `servers[0].url`. The app can also change the server URL at runtime with `createClient({ serverUrl })` or `configure({ serverUrl })`. See [Authentication](../guides/use-generated-client.md#authentication) in the usage guide. |
| `--setup`        | string   | The path to a publisher setup module that the command includes in the client. Use it to pre-configure defaults, for example the server URL, retries, headers, and middleware. A published SDK then contains these defaults. See [Publisher defaults](../guides/customize-client-generation.md#publisher-defaults).                                                                     |
| `--docs`         | boolean  | Also write the reference documentation for what this run generates: one Markdown page for each selected generator that documents itself (the CLI, and each SDK). Default value is `false`.                                                                                                                                                                                             |
| `--go-package`   | string   | The package clause in the output of the `go` generator. It must be a valid Go package name (lowercase letters, digits, and `_`; it must not start with a digit or be a keyword). Default value is `client`.                                                                                                                                                                            |
| `--config`       | string   | Specify the path to the [configuration file](#generate-from-the-configuration-file).                                                                                                                                                                                                                                                                                                   |
| `--help`         | boolean  | Display help.                                                                                                                                                                                                                                                                                                                                                                          |
| `--version`      | boolean  | Display version number.                                                                                                                                                                                                                                                                                                                                                                |

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

```bash
redocly generate-client openapi.yaml -o src/api/client.ts --runtime module
```

## Resources

- **[Use the generated client](../guides/use-generated-client.md)** - Learn how to use the client produced by the `generate-client` command
- **[Move an app to a generated client](../guides/migrate-to-generated-client.md)** - Replace a hand-written client, one call site at a time
- **[`client` configuration](../configuration/reference/client.md)** - Explore the settings for the `generate-client` command
- **[Lint command](./lint.md)** - Validate your API description before you generate a client
- **[Bundle command](./bundle.md)** - Combine a multi-file description into one input file
