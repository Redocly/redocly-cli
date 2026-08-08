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
[`redocly eject-generator <name>`](../commands/eject-generator.md): it vendors any built-in generator into `./generators/` as an editable file you own.
An ejected-unmodified generator produces byte-identical output, and the path entry takes over the built-in name — regeneration survives every customization.
[`--update`](../commands/eject-generator.md#updating-an-ejected-generator) merges later built-in versions into your copy.

Eject also writes the generator's design as an agent skill (`.claude/skills/<name>-generator/SKILL.md`) plus the shared authoring skill.
Your agent treats the design as the source of truth: state the change there first, then make the code match — and never hand-edit generated output, only the generator.

## Custom generators

The built-in generators cover common targets.
For anything else derived from the same description (validators in another library, a permissions map, a house-style SDK), write a **custom generator**: it reads the same API model the built-ins consume, so its output never drifts from the description.
A generator adds artifacts _next to_ the client — it doesn't change the generated client's behavior; for that, use [publisher defaults](#publisher-defaults) or let the consumer compose [middleware](./use-generated-client.md#middleware).

A generator is `{ name, run }` (plus optional compatibility metadata); author it with `defineGenerator` from the package root.
The output is text, so a generator can emit **any language** — Python models, a Go client, a permissions matrix.
Emitted file paths must stay inside the `--output` directory — subdirectories are fine, escapes are rejected.

**Compatibility follows the `@redocly/client-generator` version.**
The API model and the helper library are the generator contract, and it changes under semver: a breaking change bumps the major version (the minor, while the package is `0.x`).
Declare the version you authored against with `requiresGenerator: '^1.2.0'`, and an incompatible CLI fails upfront — naming the version it has, the version you need, and the upgrade — instead of feeding your generator a model shape it doesn't expect.
Ejected generators record it for you.
The accepted range forms are `^1.2.0`, `~1.2.0`, `>=1.2.0`, and an exact `1.2.0`; anything else is rejected as unreadable rather than guessed at.
Omitting `requiresGenerator` means "assume current", which is fine while you iterate.
Set it before the generator outlives the CLI it was written against — a shared repository, a published package, anything regenerated by CI — since the failure it prevents (a changed model shape) otherwise shows up as strange output rather than an error.

**A generator can declare its own options** with a JSON Schema, so publishers configure it the way they configure the built-ins:

```js
export default defineGenerator({
  name: 'permissions-matrix',
  // The toolkit version this was written against. Declare it from the start: a generator
  // usually outlives the CLI version it was written for, and without it a model change
  // surfaces as odd output far from its cause.
  requiresGenerator: '^1.2.0',
  options: {
    type: 'object',
    properties: { groupBy: { enum: ['tag', 'path'], default: 'tag' } },
    additionalProperties: false,
  },
  run({ model, outputPath, options }) {
    // `options` is validated against the schema before `run` is called.
  },
});
```

```yaml
client:
  generators:
    - ./tools/permissions-matrix.mjs
  options:
    permissions-matrix:
      groupBy: path
```

The schema covers what configuration needs, not all of JSON Schema:
a top-level `type: 'object'` with `properties`, `required`, and `additionalProperties`,
where each property is a scalar (`string`, `number`, `boolean`), an `enum`, or an array of scalars (`{ type: 'array', items: { type: 'string' } }`).
Each property may carry a `default` and a `description`.

Validation runs once per generator before any file is written:
an unknown key, a value of the wrong type, a value outside an `enum`, or a missing `required` key fails generation with the generator's name and the offending key.
Unknown keys are rejected unless the schema sets `additionalProperties: true`.
`run` receives `options` with defaults applied, so a generator reads its options without re-checking them.
Setting `options` for a selected generator that declares no schema warns — the entry would otherwise be silently ignored.

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
| `paginationRuleFor(op, config)`                 | The pagination rule applying to an operation (per-op config > `x-redoclyPagination` > fitting convention), normalized.                  |
| `NotSupportedError`                             | Throw it to reject an option the generator can't honor — the CLI prints the message as a user error, not a crash.                       |

These helpers plus `Printer` are the ONE way to author a generator, in any output language.
Nothing in the authoring path depends on the `typescript` package, so a generator also runs in the browser or any other embedded host.
The only part of `generate-client` that parses TypeScript is baking a `--setup` module, which is why `typescript` is an optional peer dependency: install it if you use that flag, and skip it otherwise.

`redocly eject-generator <name>` writes this guidance into your repo as an agent skill, so your coding agent has the contract, the model reference, and this helper table without being told.

### TypeScript artifacts

TypeScript is just another output language: the same package root exports the TypeScript-specific renderers beside the neutral helpers.
`tsType` is the schema→type renderer the built-in sdk itself uses, so the mapping (refs, arrays, unions, formats, parenthesization) matches the generated client exactly:

```js
import { tsType } from '@redocly/client-generator';

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

The package root exports `tsType`, `tsJsdoc`, `codeLiteral`, `operationSignature`, and `pascalCase` alongside the model (IR) types and the neutral helpers — one import path for everything.
For a trivial artifact, returning a plain string as `content` works too.

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
See the [`typescript-types-generator` example](https://github.com/Redocly/redocly-cli/tree/main/tests/e2e/generate-client/examples/typescript-types-generator) for the runnable `tsType`-based plugin (including type-importing referenced schemas), the [`custom-generator` example](https://github.com/Redocly/redocly-cli/tree/main/tests/e2e/generate-client/examples/custom-generator) for a minimal string-building one, and the [`nested-facade` example](https://github.com/Redocly/redocly-cli/tree/main/tests/e2e/generate-client/examples/nested-facade) for a realistic one that derives an `api.<resource>.<operation>` facade from the description's tags.

## Resources

- [`generate-client` command](../commands/generate-client.md) — flags, output modes, and invocation.
- [`client` configuration](../configuration/reference/client.md) — the `redocly.yaml` `client` block.
- [Use the generated client](./use-generated-client.md) — the consumer-side guide.
