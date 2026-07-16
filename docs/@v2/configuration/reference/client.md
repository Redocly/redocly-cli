# `client`

## Introduction

The [`generate-client`](../../commands/generate-client.md) command reads its settings from `redocly.yaml`.
A top-level `client` block holds shared defaults.
Each API under `apis:` supplies the command's input (`root`), an optional output (`clientOutput`), and any per-API overrides under `apis.<name>.client`.

```yaml
# redocly.yaml
client: # shared defaults for every generated client
  generators:
    - sdk
  argsStyle: flat
apis:
  cafe:
    root: ./openapi.yaml # the input
    clientOutput: ./src/api/client.ts # optional; defaults to `<api-name>.client.ts` (here `cafe.client.ts`)
    client: # per-API overrides (optional)
      argsStyle: grouped
```

```sh
redocly generate-client              # builds every api with a `client` block or `clientOutput`
redocly generate-client cafe         # just the `cafe` api (its client block + clientOutput)
redocly generate-client --config ./config/redocly.yaml
```

## Options

The same fields are accepted at the top level (shared defaults) and under `apis.<name>.client` (per-API overrides): `generators`, `argsStyle`, `serverUrl`, `outputMode` (`single` or `split`), `runtime`, `enumStyle`, `errorMode`, `dateType`, `queryFramework`, `mockData`, `mockSeed`, `setup`, and [`pagination`](#pagination).
Each of the scalar fields mirrors the matching CLI flag — see the [command options](../../commands/generate-client.md#options) for what every field does.
The `pagination` field is config-only (no flag).

The input and output are **not** part of a `client` block:

- **input** — `apis.<name>.root` (or a path/alias passed on the command line).
- **output** — `apis.<name>.clientOutput`; when omitted it defaults to `<name>.client.ts` in the `redocly.yaml` directory. `--output` overrides it (single-API invocations only).

## Pagination

`pagination` declares how the API paginates, so paginated operations gain typed `.pages()`/`.items()` async iterators (see [Pagination in the usage guide](../../guides/use-generated-client.md#pagination)).
The block is an optional **convention rule** (the rule fields below, applied to every operation it structurally fits when `style` is set) plus per-operation `operations` overrides and an `exclude` list:

```yaml
client:
  pagination:
    style: cursor
    cursorParam: cursor
    nextCursor: /nextCursor
    items: /orders
    exclude:
      - listOrderEvents
    operations:
      listMenuItems:
        style: page
        offsetParam: page
        items: /data
```

Rule fields — the same set is accepted at the `pagination` level (the convention) and in each `operations` entry:

| Field         | Type                             | Description                                                                                                                   |
| ------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `style`       | `'cursor' \| 'offset' \| 'page'` | How the iterator advances: follow a response cursor, advance an offset by each page's item count, or increment a page number. |
| `cursorParam` | `string`                         | `cursor` style: the query parameter that receives the cursor. Required for `cursor`.                                          |
| `nextCursor`  | `string`                         | `cursor` style: JSON pointer (RFC 6901, starts with `/`) to the next cursor in the response. Required for `cursor`.           |
| `offsetParam` | `string`                         | `offset`/`page` styles: the query parameter the iterator advances. Required for `offset` and `page`.                          |
| `limitParam`  | `string`                         | Optional page-size query parameter (any style); recorded for tooling — the iterator never sets it.                            |
| `items`       | `string`                         | JSON pointer to the page's item array in the response. Always required.                                                       |

And the two container fields:

| Field        | Type                      | Description                                                                                |
| ------------ | ------------------------- | ------------------------------------------------------------------------------------------ |
| `exclude`    | `string[]`                | operationIds no source may paginate (wins over overrides, extensions, and the convention). |
| `operations` | map of operationId → rule | Per-operation rules; each entry beats the spec's `x-pagination` and the convention.        |

The style-conditional requirements and the structural fit (the advance param must be a declared query parameter of the right type; the pointers must resolve in the JSON success-response schema, `items` landing on an array) are verified at generate time: a convention that doesn't fit skips the operation, while an explicit rule that doesn't fit fails generation. The `x-pagination` operation extension in the spec takes the same rule fields; per operation, precedence is `operations[id]` > `x-pagination` > the convention.

## How the configuration applies

A per-API `client` block overrides the top-level `client` field by field; unspecified fields fall back to the top-level defaults.
The nested `pagination` block layers the same way: per-API `operations` merge by operationId and `exclude` lists union with the top-level ones.
A file-path invocation matching no `apis:` entry uses only the top-level `client`.
CLI flags then take precedence over the resolved configuration — see the [command reference](../../commands/generate-client.md#configuration).

For code-level control — including registering [custom generators](../../guides/use-generated-client.md#custom-generators) inline — use the programmatic `generateClient(...)` API instead.

## Resources

- [`generate-client` command](../../commands/generate-client.md) — flags, output modes, and invocation.
- [Use the generated client](../../guides/use-generated-client.md) — the runtime API (auth, retries, middleware, extra generators).
- [`apis` configuration](../apis.md) — the `apis:` section and its aliases.
