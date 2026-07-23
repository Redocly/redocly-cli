# `generate-client`

{% admonition type="warning" name="Experimental" %}
`generate-client` is an experimental feature: its flags, generated output, configuration schema, and custom-generator API may change in any minor release until it's stable.
We'd love your feedback while we stabilize it.
{% /admonition %}

## Introduction

The `generate-client` command generates a typed TypeScript client from an OpenAPI 3.x description.
Swagger 2.0 descriptions are also accepted and normalized to the 3.x shape before generation.
The description is validated first: unresolved `$ref`s or structural errors fail generation with the problems listed, independent of your lint configuration.

The generated client has zero runtime dependencies by default — it uses only web-standard APIs (`fetch`, `AbortController`, `URLSearchParams`), so it runs in browsers, Node, Bun, Deno, and edge runtimes.
By default it emits a single self-contained file with inline types and one async function per operation.

The `<api>` argument is a file path, a URL, or an [`apis:` alias](../configuration/index.md), resolved the same way as in other commands such as `bundle` and `lint`.
An alias, or a path matching an api's `root`, uses that api's `client` block and `clientOutput`; an unmatched path or URL uses the top-level `client` defaults.
With no argument, a client is generated for every api that declares a `client` block or a `clientOutput` (see [`client` configuration](../configuration/reference/client.md)).

This page covers running the command; for the generated client's runtime API (auth, error handling, middleware, retries, and the add-on generators), see [Use the generated client](../guides/use-generated-client.md).

## Usage

```bash
redocly generate-client
redocly generate-client <api>
redocly generate-client <api> [--output=<path>] [--output-mode=<mode>] [--runtime=<mode>]
redocly generate-client <api> [--generator=<name>] [--args-style=<style>] [--error-mode=<mode>]
redocly generate-client <api> [--config=<path>]
```

## Options

| Option           | Type       | Description                                                                                                                                                                                                                                                                                                                                                    |
| ---------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `api`            | `string`   | OpenAPI description file path, URL, or an `apis:` alias. Omit it to generate for every api that has a `client` block or `clientOutput`.                                                                                                                                                                                                                        |
| `--output`, `-o` | `string`   | Output path (must end in `.ts`); the entry file in multi-file modes. Defaults to the api's `clientOutput`, else `<name>.client.ts` next to the configuration file. Single-API invocations only.                                                                                                                                                                |
| `--output-mode`  | `string`   | File layout. See [Choose an output mode](#choose-an-output-mode). <br/> **Possible values:** `single`, `split`. Default value is `single`.                                                                                                                                                                                                                     |
| `--runtime`      | `string`   | Where the client's engine lives. See [Choose a runtime](#choose-a-runtime). <br/> **Possible values:** `inline`, `package`. Default value is `inline`.                                                                                                                                                                                                         |
| `--import-ext`   | `string`   | Extension in generated relative imports. See [Run with Node directly](../guides/use-generated-client.md#run-with-node-directly). <br/> **Possible values:** `js` (the tsc/bundler convention), `ts` (for Node's built-in type stripping). Default value is `js`.                                                                                               |
| `--generator`    | `[string]` | Generator to run — a built-in name (`tanstack-query` also has `-vue`/`-svelte`/`-solid` variants) or a custom generator's path or package; repeat the flag to run several. Default value is `sdk`. See [Generators](../guides/use-generated-client.md#generators).                                                                                             |
| `--args-style`   | `string`   | How operation inputs are passed. See [Argument style](../guides/use-generated-client.md#argument-style). <br/> **Possible values:** `flat`, `grouped`. Default value is `flat`.                                                                                                                                                                                |
| `--error-mode`   | `string`   | How operations report HTTP errors. See [Error handling](../guides/use-generated-client.md#error-handling). <br/> **Possible values:** `throw`, `result`. Default value is `throw`.                                                                                                                                                                             |
| `--date-type`    | `string`   | Type of `date`/`date-time` fields; pair `Date` with the `transformers` generator. <br/> **Possible values:** `string`, `Date`. Default value is `string`.                                                                                                                                                                                                      |
| `--mock-data`    | `string`   | Data mode for the `mock` generator. <br/> **Possible values:** `static` (deterministic literals), `faker` (`@faker-js/faker` calls). Default value is `static`.                                                                                                                                                                                                |
| `--mock-seed`    | `number`   | Seed for `faker`-mode mocks, for reproducible data. Ignored in `static` mode.                                                                                                                                                                                                                                                                                  |
| `--server-url`   | `string`   | Override the server URL baked into the client. Accepts an absolute (`https://api.example.com`) or relative (`/v1`) URL. Defaults to `servers[0].url`. The app can also repoint the client at runtime — `createClient({ serverUrl })` or `configure({ serverUrl })`, see [Authentication](../guides/use-generated-client.md#authentication) in the usage guide. |
| `--setup`        | `string`   | Path to a publisher setup module baked into the client. See [Publisher defaults](../guides/use-generated-client.md#publisher-defaults).                                                                                                                                                                                                                        |
| `--config`       | `string`   | Specify path to the [configuration file](#generate-from-the-configuration-file).                                                                                                                                                                                                                                                                               |

## Examples

### Generate from the configuration file

Instead of passing flags every time, keep the settings in `redocly.yaml` under a top-level `client` block and per-API `apis.<name>.client` / `clientOutput` — see the [`client` configuration reference](../configuration/reference/client.md) for the fields and how they layer.
CLI flags take precedence over the configuration.
Auto-pagination has no CLI flag; it's declared only as [`client.pagination`](../configuration/reference/client.md#pagination-object) configuration or the `x-pagination` operation extension.

```yaml
client:
  generators:
    - sdk
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

An unmatched path or URL uses the top-level `client` defaults; `--output` names the entry file:

```bash
redocly generate-client openapi.yaml --output dist/client.ts
```

### Choose an output mode

`--output-mode` controls how the client is split across files:

- `single` (default) — one file (self-contained with the default `inline` runtime).
- `split` — two files: the schema types and type guards move to a sibling `<name>.schemas.ts`, and the entry file re-exports them, so your imports are the same as in `single`.

```bash
redocly generate-client openapi.yaml -o src/api/client.ts --output-mode split
```

Both modes work with both runtimes.

### Choose a runtime

`--runtime` controls where the client's engine (request building, auth, retries, middleware, SSE) lives:

- `inline` (default) — the runtime source is embedded in the generated output (only the parts your API needs): self-contained, zero runtime dependencies.
- `package` — the generated file imports the runtime from `@redocly/client-generator` and contains only the types, operation descriptors, and thin call wrappers.

Choose `package` when you want engine fixes to arrive via `npm update @redocly/client-generator` with no regeneration; the consuming app must then have that package installed as a regular dependency.
Your application code is identical in both modes.
See [Package runtime](../guides/use-generated-client.md#package-runtime) in the usage guide and the [`package-runtime` example](https://github.com/Redocly/redocly-cli/tree/main/tests/e2e/generate-client/examples/package-runtime).

## Resources

- [Use the generated client](../guides/use-generated-client.md) — the runtime API and the add-on generators.
- [`client` configuration](../configuration/reference/client.md) — the `redocly.yaml` `client` block.
- [Lint command](./lint.md) to validate your API description before generating a client.
- [Bundle command](./bundle.md) to combine a multi-file description into a single input file.
