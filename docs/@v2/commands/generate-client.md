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

The generated client has **zero runtime dependencies** by default — it uses only web-standard APIs (`fetch`, `AbortController`, `URLSearchParams`, …), so it runs in browsers, Node, Bun, Deno, and edge runtimes.
By default it emits a single self-contained file with inline types and one async function per operation; opt in to a versioned, npm-updatable runtime instead with [`--runtime package`](#runtime-distribution).

This page covers running the command; for the generated client's runtime API (auth, error handling, middleware, retries, and the add-on generators) see [Use the generated client](../guides/use-generated-client.md).

## Usage

```sh
redocly generate-client                          # every api with a `client` block or `clientOutput`
redocly generate-client cafe                     # a single `apis:` alias from redocly.yaml
redocly generate-client openapi.yaml -o dist/client.ts   # a file path or URL
```

With no argument, a client is generated for every api that declares a `client` block or a `clientOutput` under `apis:` (see [`client` configuration](../configuration/reference/client.md)).
Otherwise `<api>` is a file path, a URL, or an [`apis:` alias](../configuration/index.md), resolved the same way as in other commands such as `bundle` and `lint`: an alias — or a path matching an api's `root` — uses that api's `client` block and `clientOutput`, while an unmatched path/URL uses the top-level `client` defaults.

## Options

| Option              | Type       | Description                                                                                                                                                                                                                       |
| ------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `api`               | `string`   | OpenAPI description file path, URL, or an `apis:` alias. Omit it to generate for every api that has a `client` block or `clientOutput`.                                                                                           |
| `--output`, `-o`    | `string`   | Output path (must end in `.ts`); the entry file in multi-file modes. Defaults to the api's `clientOutput`, else `<name>.client.ts` in the config dir. Not allowed when generating for multiple apis.                              |
| `--output-mode`     | `string`   | File layout: `single` (default) or `split`. See [Output modes](#output-modes).                                                                                                                                                    |
| `--runtime`         | `string`   | `inline` (default, self-contained file — zero runtime dependencies) or `package` (imports the runtime from `@redocly/client-generator`; engine fixes arrive via `npm update`). See [Runtime distribution](#runtime-distribution). |
| `--generator`       | `string[]` | Generator to run — a built-in name or a custom generator's path/package; repeat the flag to run several (default `sdk`). See [Generators](../guides/use-generated-client.md#generators).                                          |
| `--args-style`      | `string`   | Operation inputs: `flat` (default, positional) or `grouped` (a single `vars` object). See [Argument style](../guides/use-generated-client.md#argument-style).                                                                     |
| `--enum-style`      | `string`   | Named string enums: `const-object` (default, `as const` object + union) or `union` (union only).                                                                                                                                  |
| `--error-mode`      | `string`   | `throw` (default, throws `ApiError`) or `result` (returns `{ data, error, response }`). See [Error handling](../guides/use-generated-client.md#error-handling).                                                                   |
| `--date-type`       | `string`   | `date`/`date-time` fields as `string` (default) or `Date` (pair with the `transformers` generator).                                                                                                                               |
| `--query-framework` | `string`   | TanStack Query adapter: `react` (default), `vue`, `svelte`, or `solid`.                                                                                                                                                           |
| `--mock-data`       | `string`   | `mock` generator data: `baked` (default, deterministic literals) or `faker` (`@faker-js/faker` calls).                                                                                                                            |
| `--mock-seed`       | `number`   | Seed for `faker`-mode mocks, for reproducible data. Ignored in `baked` mode.                                                                                                                                                      |
| `--server-url`      | `string`   | Override the server URL inlined into the runtime. Defaults to `servers[0].url`. Accepts absolute (`https://api.example.com`) or relative (`/v1`).                                                                                 |
| `--setup`           | `string`   | Path to a publisher setup module baked into the client. See [Publisher defaults](../guides/use-generated-client.md#publisher-defaults).                                                                                           |
| `--config`          | `string`   | Path to the `redocly.yaml` (the `client` config and `apis:` live there). Defaults to the one in the working directory.                                                                                                            |

## Configuration

Instead of passing flags every time, keep the settings in `redocly.yaml` under a top-level `client` block and per-API `apis.<name>.client` / `clientOutput`.
CLI flags take precedence over the configuration.
A per-API `client` block overrides the top-level `client` field by field; unspecified fields fall back to the top-level defaults.
See [`client` configuration](../configuration/reference/client.md) for the full reference.

Auto-pagination has **no CLI flag**: it's declared as structured configuration — [`client.pagination`](../configuration/reference/client.md#pagination) in `redocly.yaml`, or the equivalent `x-pagination` operation extension in the spec — and paginated operations gain typed `.pages()`/`.items()` async iterators. See [Pagination in the usage guide](../guides/use-generated-client.md#pagination).

## Output modes

`--output-mode` controls how the client is split across files:

- `single` (default) — one file (self-contained with the default `inline` runtime).
- `split` — two files: the schema types and type guards move to a sibling `<name>.schemas.ts`, and the entry file (everything else) re-exports them — so your imports are the same as in `single`.

`--output` names the entry file; the `.schemas.ts` sibling derives from its name and directory. Both modes work with both [runtimes](#runtime-distribution).

## Runtime distribution

`--runtime` controls where the client's engine (request building, auth, retries, middleware, SSE) lives:

- `inline` (default) — the same runtime source is embedded in the generated output (only the parts your API needs): self-contained, zero runtime dependencies.
- `package` — the generated file imports the runtime from `@redocly/client-generator` and contains only the types, pure-data operation descriptors, and thin call wrappers:

  ```ts
  import {
    createClient,
    type OperationDescriptor,
    type RequestOptions,
  } from '@redocly/client-generator';

  export const OPERATIONS = {
    getOrderById: {
      id: 'getOrderById',
      method: 'GET',
      path: '/orders/{orderId}',
      tags: ['Orders'],
      params: [
        /* … */
      ],
    },
    // …
  } as const satisfies Record<string, OperationDescriptor>;

  export const client = createClient<Ops>(OPERATIONS, { serverUrl: 'https://api.example.com' });
  export const { configure, use } = client;
  export const getOrderById = (orderId: string, init: RequestOptions = {}) =>
    client.getOrderById({ orderId }, init);
  ```

Choose `package` when you want engine fixes and improvements to arrive via `npm update @redocly/client-generator` — no regeneration, no diff in the generated file. The trade: the consuming app must have `@redocly/client-generator` installed as a regular dependency. Your application code is identical in both modes (same exports, same call shapes).

The `satisfies Record<string, OperationDescriptor>` line doubles as a **build-time version-skew guard**: an incompatible generated-file/runtime pair fails the consumer's `tsc` instead of misbehaving at runtime.

In both modes the generated module exports **both call styles** — the `client` instance (grouped-args methods) and the free-function operations (`--args-style` shapes those). Both runtimes work with both [output modes](#output-modes) and every generator.

## Resources

- [Use the generated client](../guides/use-generated-client.md) — the runtime API and the add-on generators.
- [`client` configuration](../configuration/reference/client.md) — the `redocly.yaml` `client` block.
- [Lint command](./lint.md) to validate your API description before generating a client.
- [Bundle command](./bundle.md) to combine a multi-file description into a single input file.
