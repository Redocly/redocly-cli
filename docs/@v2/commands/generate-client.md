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

This page covers running the command; for the generated client's runtime API (auth, error handling, middleware, retries, and the add-on generators) see [Use the generated client](./generate-client-usage.md).

## Usage

```sh
redocly generate-client                          # every api with a `client` block (see Configuration)
redocly generate-client cafe                     # a single `apis:` alias from redocly.yaml
redocly generate-client openapi.yaml -o src/client.ts   # a file path (ignores `apis:`)
```

With **no argument**, a client is generated for every api that declares a `client` block under `apis:` (see [`client` configuration](../configuration/client.md)). Otherwise `<api>` is a file path, a URL, or an [`apis:` alias](../configuration/index.md): an alias uses that api's `client` block and `clientOutput`, while a plain path/URL ignores the `apis:` section and uses the top-level `client` defaults.

## Options

| Option              | Type     | Description                                                                                                                                                                                          |
| ------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `api`               | `string` | OpenAPI description file path, URL, or an `apis:` alias. Omit it to generate for every api that has a `client` block.                                                                                |
| `--output`, `-o`    | `string` | Output path (must end in `.ts`); the entry file in multi-file modes. Defaults to the api's `clientOutput`, else `<name>.client.ts` in the config dir. Not allowed when generating for multiple apis. |
| `--output-mode`     | `string` | File layout: `single` (default), `split`, `tags`, or `tags-split`. See [Output modes](#output-modes).                                                                                                |
| `--generators`      | `string` | Comma-separated generators to run (default `sdk`). See [Generators](./generate-client-usage.md#generators).                                                                                          |
| `--facade`          | `string` | Operation shape: `functions` (default, standalone functions) or `service-class` (methods on a `Client` class).                                                                                       |
| `--name`            | `string` | Class name for the `service-class` facade in `single`/`split` layouts. Default `Client`.                                                                                                             |
| `--args-style`      | `string` | Operation inputs: `flat` (default, positional) or `grouped` (a single `vars` object). See [Argument style](./generate-client-usage.md#argument-style).                                               |
| `--enum-style`      | `string` | Named string enums: `const-object` (default, `as const` object + union) or `union` (union only).                                                                                                     |
| `--error-mode`      | `string` | `throw` (default, throws `ApiError`) or `result` (returns `{ data, error, response }`). See [Error handling](./generate-client-usage.md#error-handling).                                             |
| `--date-type`       | `string` | `date`/`date-time` fields as `string` (default) or `Date` (pair with the `transformers` generator).                                                                                                  |
| `--query-framework` | `string` | TanStack Query adapter: `react` (default), `vue`, `svelte`, or `solid`.                                                                                                                              |
| `--mock-data`       | `string` | `mock` generator data: `baked` (default, deterministic literals) or `faker` (`@faker-js/faker` calls).                                                                                               |
| `--mock-seed`       | `number` | Seed for `faker`-mode mocks, for reproducible data. Ignored in `baked` mode.                                                                                                                         |
| `--server-url`      | `string` | Override the server URL inlined into the runtime. Defaults to `servers[0].url`. Accepts absolute (`https://api.example.com`) or relative (`/v1`).                                                    |
| `--setup`           | `string` | Path to a publisher setup module baked into the client. See [Publisher defaults](./generate-client-usage.md#publisher-defaults).                                                                     |
| `--config`          | `string` | Path to the `redocly.yaml` (the `client` config and `apis:` live there). Defaults to the one in the working directory.                                                                               |

## Configuration

Instead of passing flags every time, keep the settings in `redocly.yaml` under a top-level `client` block and per-API `apis.<name>.client` / `clientOutput`. Settings resolve **top-level `client` → per-API `client` → CLI flags**. See [`client` configuration](../configuration/client.md) for the full reference.

## Output modes

`--output-mode` controls how the client is split across files:

- `single` (default) — one self-contained file.
- `split` — endpoints, schemas, and runtime in sibling files.
- `tags` — one endpoints file per OpenAPI tag.
- `tags-split` — a folder per tag.

All multi-file modes share the schemas and runtime modules; `--output` names the entry file, and the siblings derive from its name and directory.

## Resources

- [Use the generated client](./generate-client-usage.md) — the runtime API and the add-on generators.
- [`client` configuration](../configuration/client.md) — the `redocly.yaml` `client` block.
- [Lint command](./lint.md) to validate your API description before generating a client.
- [Bundle command](./bundle.md) to combine a multi-file description into a single input file.
