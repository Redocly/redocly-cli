# `client`

## Introduction

The `client` configuration contains the settings for the [`generate-client`](../../commands/generate-client.md) command.
You can put the block at the root of the configuration file, where it holds the defaults.
You can also put it inside an [API-specific section](./apis.md) (`apis.<name>.client`), where it overrides the root block for that API.

The input and output are not part of the `client` block:

- **input** — `apis.<name>.root`, or a path or alias that you give on the command line.
- **output** — `apis.<name>.clientOutput`.
  If you omit it, the default is `<name>.client.ts` next to the configuration file.
  The `--output` flag overrides it when you generate one API.

## Options

Each scalar option matches the related CLI flag and has the same default.
See the [command options](../../commands/generate-client.md#options) for the full description of each value.
The `pagination` option is available only in the configuration file.
It is a structured, durable contract that belongs in versioned configuration, not in a shell string.
If you run without a configuration file, declare pagination for each operation with the `x-redoclyPagination` extension in the description.
As an alternative, pass `pagination` to the programmatic `generateClient(...)`.

| Option            | Type                                    | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ----------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `generators`      | [string]                                | The generators to run, in order. Each entry is a built-in name (`typescript`, `zod`, `tanstack-query` or its `-vue`/`-svelte`/`-solid` variants, `swr`, `mock`, `transformers`, `cli`, `python`, `go`, `php`), or the path or package name of a custom generator.                                                                                                                                                                                             |
| `outputMode`      | string                                  | The file layout: `single` or `split`. This option applies to TypeScript output only. The `python`, `go`, and `php` SDKs always emit one client module (the `module` runtime adds their runtime files beside it).                                                                                                                                                                                                                                              |
| `runtime`         | string                                  | The runtime distribution: `inline` (the runtime is embedded in the generated output) or `module` (the runtime is written as real files in a `runtime/` folder beside the client).                                                                                                                                                                                                                                                                             |
| `importExt`       | string                                  | The extension in generated relative imports: `js` (default, for tsc and bundlers) or `ts` (for Node's built-in type stripping). This option applies to TypeScript output only.                                                                                                                                                                                                                                                                                |
| `argsStyle`       | string                                  | How the client receives operation inputs: `grouped` (default) groups them by transport layer (`path`, `query`, `headers`, `cookies`, `body`), and `flat` merges them into one object. This option applies to TypeScript output only. Each language SDK follows its own idiom (keyword arguments, named arguments, a params struct).                                                                                                                           |
| `errorMode`       | string                                  | How operations report HTTP errors: `throw` or `result`. The `python` SDK implements both. The `go` and `php` SDKs support only `throw`, because that is the language idiom, and they reject `result`.                                                                                                                                                                                                                                                         |
| `dateType`        | string                                  | The type of `date`/`date-time` fields: `string` or `Date`. Every language applies it: `Date` in TypeScript, `datetime`/`date` in Python, `time.Time`/`Date` in Go, `DateTimeImmutable` in PHP.                                                                                                                                                                                                                                                                |
| `mockData`        | string                                  | The data mode for the `mock` generator: `static` or `faker`.                                                                                                                                                                                                                                                                                                                                                                                                  |
| `mockSeed`        | number                                  | The seed for mocks in `faker` mode.                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `queryKeyPrefix`  | string                                  | The first element of every `tanstack-query` query key and mutation key. It separates the cache entries when several generated APIs share one QueryClient. This option is available only in the configuration file and has no flag.                                                                                                                                                                                                                            |
| `codeSamples`     | boolean                                 | Emit `<output>.code-samples.yaml` next to the client. This file is an OpenAPI Overlay that adds `x-codeSamples` to each operation. The samples come from each selected generator that implements `sample()`. This option is available only in the configuration file and has no flag.                                                                                                                                                                         |
| `serverUrl`       | string                                  | The server URL that the client includes as its default. If you do not set it, the client uses `servers[0].url`.                                                                                                                                                                                                                                                                                                                                               |
| `goPackage`       | string                                  | The package clause for the output of the `go` generator. The value must be a valid Go package name: lowercase letters, digits, and `_`, with no digit at the start, and not a keyword. An invalid value stops generation, so the generator does not emit a file that Go cannot compile. Default: `client`.                                                                                                                                                    |
| `cliOutput`       | string                                  | The path of a composed CLI entry. The entry includes every api that emits a cli module: from the `cli` generator by name, ejected, or included as a prerequisite. The result is one binary. You address each api by its alias, and each api has `<BINNAME>_<ALIAS>_*` credential variables. This option is available only in the top-level `client` block. See [Compose and extend the CLI](../../guides/use-generated-client.md#compose-and-extend-the-cli). |
| `options`         | object                                  | Options for each generator, keyed by generator name. The command validates each entry against the schema that the generator declares. The `python` generator accepts `models`: `dataclass` (default) or `pydantic`. See [Custom generators](../../guides/customize-client-generation.md#custom-generators).                                                                                                                                                   |
| `docs`            | boolean                                 | Also write the reference documentation for what the run generates: one Markdown page for each selected generator that documents itself (`<output>.cli.md`, `<output>.python.md`, and so on). The `--docs` flag sets it too. Default `false`.                                                                                                                                                                                                                  |
| `docsFrontmatter` | boolean                                 | Emit YAML front matter carrying the title above each documentation page, for docs sites that expect it. This option is available only in the configuration file. Default `false`.                                                                                                                                                                                                                                                                             |
| `setup`           | string                                  | The path to a publisher setup module that the client includes. The module sets defaults such as the server URL, retries, headers, and middleware. See [Publisher defaults](../../guides/customize-client-generation.md#publisher-defaults).                                                                                                                                                                                                                   |
| `pagination`      | [Pagination object](#pagination-object) | Declares how the API paginates. Paginated operations then get typed `.pages()`/`.items()` async iterators.                                                                                                                                                                                                                                                                                                                                                    |

### Pagination object

The `pagination` block is an optional convention rule, plus `operations` overrides for single operations and an `exclude` list.
The convention rule uses the rule fields below.
When you set `style`, the rule applies to each operation that it structurally fits.
See [Pagination in the usage guide](../../guides/use-generated-client.md#pagination) to learn how the generated iterators behave.

| Option        | Type                      | Description                                                                                                                                                                                                                                                                                                                                                                           |
| ------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `style`       | string                    | How the iterator advances: `cursor` (follow a response cursor), `offset` (advance an offset by the item count of each page), `page` (increment a page number), or `link` (follow the RFC 8288 `Link` header `rel="next"` in the response). The `link` style has no advance parameter. As a convention rule, `link` fits only the operations whose response documents a `Link` header. |
| `cursorParam` | string                    | The query parameter that receives the cursor. **REQUIRED** for the `cursor` style.                                                                                                                                                                                                                                                                                                    |
| `nextCursor`  | string                    | The JSON pointer (RFC 6901, starts with `/`) to the next cursor in the response. **REQUIRED** for the `cursor` style.                                                                                                                                                                                                                                                                 |
| `hasMore`     | string                    | Optional (`cursor` style): the JSON pointer to a boolean "more pages" flag. Iteration stops when the flag resolves to `false`. Use it for APIs whose cursor stays non-null on the last page.                                                                                                                                                                                          |
| `offsetParam` | string                    | The query parameter that the iterator advances. **REQUIRED** for the `offset` and `page` styles.                                                                                                                                                                                                                                                                                      |
| `limitParam`  | string                    | Optional: the page-size query parameter for any style. The generator records it for tooling. The iterator never sets it.                                                                                                                                                                                                                                                              |
| `items`       | string                    | **REQUIRED**. The JSON pointer to the item array of the page in the response. Use `''` if the response body is the item array itself.                                                                                                                                                                                                                                                 |
| `exclude`     | [string]                  | The operationIds that no source may paginate. This list wins over overrides, extensions, and the convention.                                                                                                                                                                                                                                                                          |
| `operations`  | map of operationId → rule | Rules for single operations, with the same fields as the convention. Each entry overrides the `x-redoclyPagination` extension in the description and the convention.                                                                                                                                                                                                                  |

The generator verifies the rules at generate time.
The advance parameter must be a declared query parameter of the correct type: string for `cursor`, numeric for `offset` and `page`.
The JSON pointers must resolve in the JSON success-response schema of the operation.
The `items` pointer must point to an array, and the `hasMore` pointer must point to a boolean.
If the convention does not fit an operation, the generator skips that operation.
If an explicit rule does not fit, generation fails.
The `x-redoclyPagination` operation extension in the API description uses the same rule fields.
For each operation, the precedence is `operations[id]`, then `x-redoclyPagination`, then the convention.

## Examples

### Configure defaults with a per-API override

An API with its own `client` block uses that block instead of the top-level block.
The top-level block applies to APIs without their own block.
A file-path invocation that matches no `apis:` entry uses the top-level `client`.
CLI flags override the resolved configuration.

```yaml
client:
  generators:
    - typescript
  argsStyle: grouped
apis:
  cafe:
    root: ./openapi.yaml
    clientOutput: ./src/api/client.ts
    client: # replaces the top-level block for this API
      generators:
        - typescript
        - zod
      argsStyle: flat
  orders:
    root: ./orders.yaml # no client block — uses the top-level one
    clientOutput: ./src/api/orders.client.ts
```

### Declare pagination

Declare the convention one time, with overrides and exclusions for single operations:

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

For code-level control, use the programmatic `generateClient(...)` API instead.
With this API, you can also register [custom generators](../../guides/customize-client-generation.md#custom-generators) inline.

## Related options

- The [apis](./apis.md) settings define the root document, the output, and the overrides for each API.

## Resources

- **[`generate-client` command](../../commands/generate-client.md)** - Learn about the the `generate-client` command's flags, output modes, and invocation
- **[Use the generated client](../../guides/use-generated-client.md)** - Learn how to use the client produced by the `generate-client` command
