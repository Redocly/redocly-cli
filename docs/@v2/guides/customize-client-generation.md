# Customize client generation

How to shape what [`generate-client`](../commands/generate-client.md) produces — pre-configured publisher defaults and custom generators.
This page is for the person who **runs the generator** (an SDK publisher, a platform team); for consuming the generated client, see [Use the generated client](./use-generated-client.md).

## Publisher defaults

Middleware and configuration are normally composed by the [consumer](./use-generated-client.md#middleware).
If you **publish an SDK** you can pre-configure the client at generation time with `--setup <file>`: defaults such as the server URL, retries, headers, and middleware are included in the generated client, so the SDK ships with them built in.
Setup changes the client's built-in _behavior_; it emits no extra file — to derive additional artifacts from the description, use [generators](./use-generated-client.md#generators) instead.

A setup module is a plain file that default-exports a `{ config, middleware }` object — no imports required:

```ts
// client-setup.ts
export default {
  config: { serverUrl: 'https://api.acme.com', retry: { retries: 3 } },
  middleware: [
    {
      onRequest: (ctx) => {
        ctx.headers['X-Acme-SDK'] = '1.4.0';
      },
    },
  ],
};
```

```sh
redocly generate-client openapi.yaml --output src/api/client.ts --setup ./client-setup.ts
```

Inclusion is a generation-time transform: only the setup expression lands in the client, so an `inline` client stays zero-dependency, and the included block is typed against the client's own contract in the generated file — a shape mistake fails the consumer's `tsc`.

For editor autocomplete while authoring, optionally wrap the object in `defineClientSetup` — a typing-only helper, stripped at generation time, identical in both runtimes:

```ts
// client-setup.ts — the same setup, typed while editing
import { defineClientSetup, type RequestContext } from '@redocly/client-generator';

export default defineClientSetup({
  config: { serverUrl: 'https://api.acme.com', retry: { retries: 3 } },
  middleware: [
    {
      onRequest: (ctx: RequestContext) => {
        ctx.headers['X-Acme-SDK'] = '1.4.0';
      },
    },
  ],
});
```

The pre-configured block runs before the consumer's own setup.
**Config values** layer lowest to highest — later always wins, so a consumer overrides a pre-configured default:

1. The description's defaults (for example `servers[0].url`).
2. The publisher setup.
3. The app's `configure()`.

**Middleware composes** instead (publisher middleware first, then the consumer's).
Express un-bypassable behavior as middleware, not a custom `fetch`.
A setup file may import **only** from `@redocly/client-generator`.
See the [`baked-setup` example](https://github.com/Redocly/redocly-cli/tree/main/tests/e2e/generate-client/examples/baked-setup).

## Eject

The fastest path to a customized generator is
[`redocly eject-generator <name>`](../commands/eject-generator.md): it vendors a built-in language generator (`python`, `go`, `php`) into `./generators/` as an editable file, with a pristine snapshot for [three-way updates](../commands/eject-generator.md#how-it-works) and the `AGENTS.md` authoring guide for your coding agent.
An ejected-unmodified generator produces byte-identical output, and the path entry takes over the built-in name — regeneration survives every customization.

Eject drops `AGENTS.md` next to the generator: your agent reads it to learn the model shape, the helper library, and the verify loop (edit the generator → `redocly generate-client` → review the client diff — generated files are never hand-edited).

## Custom generators

The built-in generators cover common targets.
For anything else derived from the same description (validators in another library, a permissions map, a house-style SDK), write a **custom generator**: it reads the same API model the built-ins consume, so its output never drifts from the description.
A generator adds artifacts _next to_ the client — it doesn't change the generated client's behavior; for that, use [publisher defaults](#publisher-defaults) or let the consumer compose [middleware](./use-generated-client.md#middleware).

A generator is `{ name, run }` (plus optional compatibility metadata); author it with `defineGenerator` from the package root.
The output is text, so a generator can emit **any language** — Python models, a Go client, a permissions matrix — not just TypeScript.

### Language-neutral helpers

The package root exports pure helpers over the API model that cover the cross-language variance points, so a generator in any output language never re-implements schema semantics:

| Helper                                          | Use                                                                                                                                     |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `flattenAllOf(schema, model)`                   | The merged property view of `allOf` compositions — languages without intersection types render this.                                    |
| `discriminatorCases(schema, model)`             | `{ property, cases }` dispatch table for discriminated unions (sealed hierarchy, type switch, `Union` — each language renders its own). |
| `isNullable(schema)` / `unwrapNullable(schema)` | Detect and strip `null` union members (`Optional[T]`, pointers, `Option<T>`).                                                           |
| `enumValues(schema)`                            | Values plus SCREAMING_SNAKE member-name suggestions.                                                                                    |
| `casing` / `identifierFor(name, opts)`          | camel/pascal/snake/screaming casing; keyword-safe identifiers (`RESERVED_WORDS.python/go/typescript` shipped, pass your own set).       |
| `Printer`                                       | Indentation-aware text builder — no manual whitespace bookkeeping.                                                                      |
| `docText(description)`                          | Description text as trimmed lines for any comment syntax.                                                                               |
| `schemaAtPointer(schema, pointer, model)`       | Resolve an RFC 6901 JSON pointer over a schema, through refs and `allOf` — e.g. a pagination `items` pointer to its element type.       |
| `paginationRuleFor(op, config)`                 | The pagination rule applying to an operation (per-op config > `x-redocly-pagination` > fitting convention), normalized.                 |

A generator that imports only these helpers (and not the TypeScript toolkit below) runs without the `typescript` package installed.

For a repo-local, agent-readable version of this guidance, copy the [`AGENTS.md` template](https://github.com/Redocly/redocly-cli/blob/main/packages/client-generator/eject-assets/AGENTS.md) into your generators directory — it gives any coding agent the contract, the model reference, and this helper table.

### TypeScript artifacts

For TypeScript output, render types with the text toolkit from `@redocly/client-generator/generate` — `tsType` is the same schema→type renderer the built-in sdk uses, so the mapping (refs, arrays, unions, formats, parenthesization) matches the generated client exactly:

```js
import { tsType } from '@redocly/client-generator/generate';

export default {
  name: 'response-map',
  requires: ['sdk'],
  run({ model, outputPath }) {
    const members = model.services
      .flatMap((service) => service.operations)
      .flatMap((op) => {
        const success = op.successResponses.find((r) => r.contentType.includes('json'));
        return success ? [`    ${op.name}: ${tsType(success.schema, 'string', '    ')};`] : [];
      });
    return [
      {
        path: outputPath.replace(/\.ts$/, '.responses.ts'),
        content: `export type ResponseShapes = {\n${members.join('\n')}\n};\n`,
      },
    ];
  },
};
```

The toolkit exports `tsType`, `tsJsdoc`, `codeLiteral`, `operationSignature`, `pascalCase`, and more; the package root exports the model (IR) types and the language-neutral helpers.
For a trivial artifact, returning a plain string as `content` works too — no toolkit required.

Select a generator in `redocly.yaml` by path or package name:

```yaml
apis:
  cafe:
    root: ./openapi.yaml
    clientOutput: ./src/api/client.ts
    client:
      generators:
        - sdk
        - ./tools/response-map-generator.ts # local path (resolved against redocly.yaml)
        - '@acme/openapi-valibot' # published package
```

Or register one **inline** with the programmatic API and select it by name:

```ts
import { generateClient } from '@redocly/client-generator';
import responseMap from './tools/response-map-generator.ts';

await generateClient({
  api: './openapi.yaml',
  output: './src/api/client.ts',
  customGenerators: [responseMap],
  generators: ['sdk', 'response-map'],
});
```

### Code samples for docs

A generator that knows how to call an operation can also document it: implement the optional `sample(operation, ctx)` hook to return one idiomatic snippet (`{ lang, label, source }`) per operation.
With `codeSamples: true` in the `client` block, generation collects every selected generator's samples into `<output stem>.code-samples.yaml` — an [OpenAPI Overlay](https://spec.openapis.org/overlay/latest.html) adding `x-codeSamples` per operation, ready for docs tooling to apply.
The built-in `sdk` generator ships the TypeScript reference implementation, so enabling the flag alone gives your Redoc docs per-operation TypeScript examples that never drift from the SDK.

Import-specifier generators execute at generation time — they carry the same trust level as any installed dependency you run.
See the [`ast-toolkit-generator` example](https://github.com/Redocly/redocly-cli/tree/main/tests/e2e/generate-client/examples/ast-toolkit-generator) for the runnable `tsType`-based plugin (including type-importing referenced schemas), the [`custom-generator` example](https://github.com/Redocly/redocly-cli/tree/main/tests/e2e/generate-client/examples/custom-generator) for a minimal string-building one, and the [`nested-facade` example](https://github.com/Redocly/redocly-cli/tree/main/tests/e2e/generate-client/examples/nested-facade) for a realistic one that derives an `api.<resource>.<operation>` facade from the description's tags.

## Resources

- [`generate-client` command](../commands/generate-client.md) — flags, output modes, and invocation.
- [`client` configuration](../configuration/reference/client.md) — the `redocly.yaml` `client` block.
- [Use the generated client](./use-generated-client.md) — the consumer-side guide.
