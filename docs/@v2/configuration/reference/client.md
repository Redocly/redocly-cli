# `client`

## Introduction

The `client` configuration provides settings for the [`generate-client`](../../commands/generate-client.md) command.
The block can be used at the root of the configuration file, where it holds shared defaults, and inside an [API-specific section](./apis.md) (`apis.<name>.client`), where it overrides the root block field by field.

The input and output are not part of the `client` block:

- **input** — `apis.<name>.root`, or a path or alias passed on the command line.
- **output** — `apis.<name>.clientOutput`; when omitted it defaults to `<name>.client.ts` next to the configuration file. The `--output` flag overrides it for single-API invocations.

## Options

Each scalar option mirrors the matching CLI flag and shares its default — see the [command options](../../commands/generate-client.md#options) for the full description of each value.
The `pagination` option is config-only and has no flag.

| Option       | Type                                    | Description                                                                                                                                                                                                           |
| ------------ | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `generators` | `[string]`                              | Generators to run, in order. Each entry is a built-in name (`sdk`, `zod`, `tanstack-query` — or its `-vue`/`-svelte`/`-solid` variants — `swr`, `mock`, `transformers`) or a custom generator's path or package name. |
| `outputMode` | `string`                                | File layout: `single` or `split`.                                                                                                                                                                                     |
| `runtime`    | `string`                                | Runtime distribution: `inline` or `package`.                                                                                                                                                                          |
| `importExt`  | `string`                                | Extension in generated relative imports: `js` (default, for tsc and bundlers) or `ts` (for Node's built-in type stripping).                                                                                           |
| `argsStyle`  | `string`                                | How operation inputs are passed: `flat` or `grouped`.                                                                                                                                                                 |
| `errorMode`  | `string`                                | How operations report HTTP errors: `throw` or `result`.                                                                                                                                                               |
| `dateType`   | `string`                                | Type of `date`/`date-time` fields: `string` or `Date`.                                                                                                                                                                |
| `mockData`   | `string`                                | Data mode for the `mock` generator: `static` or `faker`.                                                                                                                                                              |
| `mockSeed`   | `number`                                | Seed for `faker`-mode mocks.                                                                                                                                                                                          |
| `serverUrl`  | `string`                                | Server URL baked into the client; defaults to `servers[0].url`.                                                                                                                                                       |
| `setup`      | `string`                                | Path to a publisher setup module baked into the client.                                                                                                                                                               |
| `pagination` | [Pagination object](#pagination-object) | Declares how the API paginates, so paginated operations gain typed `.pages()`/`.items()` async iterators.                                                                                                             |

### Pagination object

The `pagination` block is an optional convention rule (the rule fields below, applied to every operation it structurally fits when `style` is set), plus per-operation `operations` overrides and an `exclude` list.
See [Pagination in the usage guide](../../guides/use-generated-client.md#pagination) for how the generated iterators behave.

| Option        | Type                      | Description                                                                                                                                                                  |
| ------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `style`       | `string`                  | How the iterator advances: `cursor` (follow a response cursor), `offset` (advance an offset by each page's item count), or `page` (increment a page number).                 |
| `cursorParam` | `string`                  | The query parameter that receives the cursor. **REQUIRED** for the `cursor` style.                                                                                           |
| `nextCursor`  | `string`                  | JSON pointer (RFC 6901, starts with `/`) to the next cursor in the response. **REQUIRED** for the `cursor` style.                                                            |
| `hasMore`     | `string`                  | Optional (`cursor` style): JSON pointer to a boolean "more pages" flag — iteration stops when it resolves to `false`, for APIs whose cursor stays non-null on the last page. |
| `offsetParam` | `string`                  | The query parameter the iterator advances. **REQUIRED** for the `offset` and `page` styles.                                                                                  |
| `limitParam`  | `string`                  | Optional page-size query parameter for any style; recorded for tooling — the iterator never sets it.                                                                         |
| `items`       | `string`                  | **REQUIRED**. JSON pointer to the page's item array in the response.                                                                                                         |
| `exclude`     | `[string]`                | operationIds that no source may paginate; wins over overrides, extensions, and the convention.                                                                               |
| `operations`  | map of operationId → rule | Per-operation rules taking the same fields as the convention; each entry beats the spec's `x-pagination` and the convention.                                                 |

The rules are verified at generate time: the advance parameter must be a declared query parameter of the right type (string for `cursor`, numeric for `offset` and `page`), and the JSON pointers must resolve in the operation's JSON success-response schema, with `items` landing on an array and `hasMore` on a boolean.
A convention that doesn't fit an operation skips it; an explicit rule that doesn't fit fails generation.
The `x-pagination` operation extension in the API description takes the same rule fields.
Per operation, precedence is `operations[id]`, then `x-pagination`, then the convention.

## Examples

### Configure shared defaults with a per-API override

A per-API `client` block overrides the top-level `client` field by field; unspecified fields fall back to the top-level defaults.
A file-path invocation matching no `apis:` entry uses only the top-level `client`, and CLI flags take precedence over the resolved configuration.

```yaml
client:
  generators:
    - sdk
  argsStyle: flat
apis:
  cafe:
    root: ./openapi.yaml
    clientOutput: ./src/api/client.ts
    client:
      argsStyle: grouped
```

### Declare pagination

The nested `pagination` block layers the same way: per-API `operations` merge by operationId, and `exclude` lists union with the top-level ones.

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

For code-level control — including registering [custom generators](../../guides/use-generated-client.md#custom-generators) inline — use the programmatic `generateClient(...)` API instead.

## Related options

- [apis](./apis.md) settings define each API's root document, output, and per-API overrides.

## Resources

- [`generate-client` command](../../commands/generate-client.md) — flags, output modes, and invocation.
- [Use the generated client](../../guides/use-generated-client.md) — the runtime API (auth, retries, middleware, extra generators).
