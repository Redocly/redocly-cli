# Customize client generation

Learn how to control the output of [`generate-client`](../commands/generate-client.md).
It covers pre-configured publisher defaults and custom generators.
This page is for the person who **runs the generator**, for example an SDK publisher or a platform team.
To use the generated client, see [Use the generated client](./use-generated-client.md).

## Publisher defaults

The [consumer](./use-generated-client.md#middleware) normally composes middleware and configuration.
If you **publish an SDK**, you can pre-configure the client at generation time with `--setup <file>`.
The generated client then includes defaults such as the server URL, retries, headers, and middleware.
The SDK includes these defaults when you publish it.
Setup changes the client's built-in _behavior_ and writes no extra file.
To make more artifacts from the description, use [generators](./use-generated-client.md#generators) instead.

A setup module is a plain file with a default export of a `{ config, middleware }` object.
It does not need imports:

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

Inclusion is a generation-time transform.
Only the setup expression goes into the client, so an `inline` client keeps zero dependencies.
The generated file types the included block against the client's own contract.
A shape mistake causes an error in the consumer's `tsc`.

To get editor autocomplete when you write the setup, you can wrap the object in `defineClientSetup`.
This helper only supplies types, and generation removes it.
The helper is identical in both runtimes:

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
**Config values** apply in layers, from lowest to highest.
A later value always wins, so a consumer overrides a pre-configured default:

1. The description's defaults (for example `servers[0].url`).
2. The publisher setup.
3. The app's `configure()`.

**Middleware composes** instead: the publisher middleware runs first, then the consumer's middleware.
To make a behavior that the consumer cannot bypass, use middleware, not a custom `fetch`.
A setup file can import **only** from `@redocly/client-generator`.
See the [`baked-setup` example](https://github.com/Redocly/redocly-cli/tree/main/tests/e2e/generate-client/examples/baked-setup).

## Eject

The quickest method to get a customized generator is
the [`eject-generator`](../commands/eject-generator.md) command.
The command copies any built-in generator into `./generators/` as its TypeScript source folder — editable source that you own.
An ejected generator with no changes produces byte-identical output.
In `client.generators`, the path to your copy replaces the built-in name.
Because of this, `redocly generate-client` now runs your version.
[`--update`](../commands/eject-generator.md#update-an-ejected-generator) merges later built-in versions into your copy.

The eject command also writes the generator's design as an agent skill (`.claude/skills/<name>-generator/SKILL.md`).
It writes the shared authoring skill too.
Your agent uses the design as the source of truth.
First, state the change in the design.
Then make the code agree with the design.
Do not edit the generated output by hand; edit only the generator.

## Custom generators

The built-in generators cover common targets.
For other artifacts from the same description, write a **custom generator**.
Examples are validators in another library, a permissions map, or an SDK in your house style.
A custom generator reads the same API model as the built-in generators.
Because of this, its output always agrees with the description.

A generator adds artifacts _next to_ the client.
It does not change the behavior of the generated client.
To change the behavior, use [publisher defaults](#publisher-defaults) or let the consumer compose [middleware](./use-generated-client.md#middleware).

A generator is a `{ name, run }` object, with optional compatibility metadata.
Write it with `defineGenerator` from the package root.
The output is text, so a generator can emit **any language**.
Examples are Python models, a Go client, or a permissions matrix.
Emitted file paths must stay inside the `--output` directory.
Subdirectories are permitted, but the CLI rejects paths that escape the directory.

**Compatibility follows the `@redocly/client-generator` version.**
The API model and the helper library are the generator contract, and the contract changes under semver.
A breaking change increases the major version (the minor version, while the package is `0.x`).
Declare the version that you wrote against with `requiresGenerator: '^1.2.0'`.
An incompatible CLI then fails immediately and does not give your generator a model shape it does not expect.
The error names the version the CLI has, the version you need, and the upgrade.

Ejected generators record the version for you.
The accepted range forms are `^1.2.0`, `~1.2.0`, `>=1.2.0`, and an exact `1.2.0`.
The CLI rejects other forms as unreadable and does not guess.

If you omit `requiresGenerator`, the CLI assumes the current version.
This is acceptable while you iterate.

Set the version before the generator stays in use longer than the CLI it was written for.
Examples are a shared repository, a published package, and output that CI regenerates.
Without the version, a changed model shape causes incorrect output, not an error.

A generator can declare its own options with a JSON Schema.
Publishers then configure it in the same way as the built-in generators:

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
  run({ model, output, options }) {
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

The schema covers what configuration needs, not all of JSON Schema.
It permits a top-level `type: 'object'` with `properties`, `required`, and `additionalProperties`.
Each property is a scalar (`string`, `number`, `boolean`), an `enum`, or an array of scalars (`{ type: 'array', items: { type: 'string' } }`).
Each property can have a `default` and a `description`.

Validation runs one time per generator before the CLI writes any file.
An unknown key, a value of an incorrect type, a value outside an `enum`, or a missing `required` key stops generation.
The error displays the generator's name and the incorrect key.
The CLI rejects unknown keys unless the schema sets `additionalProperties: true`.
`run` receives `options` with the defaults applied, so a generator reads its options without more checks.

If you set `options` for a selected generator that declares no schema, the CLI displays a warning.
Without the warning, the CLI would ignore the entry with no message.

### Language-neutral helpers

The package root exports pure helpers over the API model.
The helpers cover the points where output languages differ.
Because of this, a generator in any output language does not implement schema semantics again:

| Helper                                          | Use                                                                                                                                                         |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `flattenAllOf(schema, model)`                   | Gives the merged property view of `allOf` compositions. Languages without intersection types render this.                                                   |
| `discriminatorCases(schema, model)`             | Gives a `{ property, cases }` dispatch table for discriminated unions. Each language renders its own form: a sealed hierarchy, a type switch, or a `Union`. |
| `isNullable(schema)` / `unwrapNullable(schema)` | Finds and removes `null` union members (`Optional[T]`, pointers, `Option<T>`).                                                                              |
| `enumValues(schema)`                            | Gives the values plus SCREAMING_SNAKE member-name suggestions.                                                                                              |
| `casing` / `identifierFor(name, opts)`          | Gives camel/pascal/snake/screaming casing and keyword-safe identifiers (`RESERVED_WORDS.python/go/typescript` are included, or pass your own set).          |
| `Printer`                                       | A text builder that manages indentation. You do not manage whitespace manually.                                                                             |
| `docText(description)`                          | Gives the description text as trimmed lines for any comment syntax.                                                                                         |
| `schemaAtPointer(schema, pointer, model)`       | Resolves an RFC 6901 JSON pointer over a schema, through refs and `allOf`. Example: a pagination `items` pointer to its element type.                       |
| `paginationRuleFor(op, config)`                 | Gives the normalized pagination rule that applies to an operation (per-op config > `x-redoclyPagination` > fitting convention).                             |
| `NotSupportedError`                             | Throw it to reject an option that the generator cannot obey. The CLI prints the message as a user error, not a crash.                                       |

These helpers plus `Printer` are the ONE way to write a generator, in any output language.
No part of the authoring path depends on the `typescript` package.
Because of this, a generator also runs in the browser or in another embedded host.
Only one step of `generate-client` parses TypeScript: the step that bakes a `--setup` module.
For this reason, `typescript` is an optional peer dependency.
Install it if you use that flag, and do not install it otherwise.

`redocly eject-generator <name>` writes this guidance into your repository as an agent skill.
Your coding agent then has the contract, the model reference, and this helper table without instructions from you.

### TypeScript artifacts

TypeScript is one more output language.
The `@redocly/client-generator/generate` entry exports the TypeScript-specific renderers.
These renderers are not on the package root, which stays a small authoring surface.
`tsType` is the schema-to-type renderer that the built-in `typescript` generator itself uses.
Because of this, the mapping (refs, arrays, unions, formats, parenthesization) is exactly the same as in the generated client:

```js
import { tsType } from '@redocly/client-generator/generate';

export default {
  name: 'response-map',
  requires: ['typescript'],
  run({ model, output }) {
    const members = model.services
      .flatMap((service) => service.operations)
      .flatMap((op) => {
        const success = op.successResponses.find((r) => r.contentType.includes('json'));
        return success ? [`    ${op.name}: ${tsType(success.schema, 'string', '    ')};`] : [];
      });
    return [
      {
        path: output.path.replace(/\.ts$/, '.responses.ts'),
        content: `export type ResponseShapes = {\n${members.join('\n')}\n};\n`,
      },
    ];
  },
};
```

The `@redocly/client-generator/generate` entry exports `tsType`, `tsJsdoc`, `codeLiteral`, `operationSignature`, and `pascalCase`.
The package root exports the model (IR) types and the neutral helpers.
For a simple artifact, you can also return a plain string as `content`.

Select a generator in `redocly.yaml` by path or by package name:

```yaml
apis:
  cafe:
    root: ./openapi.yaml
    clientOutput: ./src/api/client.ts
    client:
      generators:
        - typescript
        - ./tools/response-map-generator.ts # local path (resolved against redocly.yaml)
        - '@acme/openapi-valibot' # published package
```

Or register a generator **inline** with the programmatic API and select it by name:

```ts
import { generateClient } from '@redocly/client-generator';
import responseMap from './tools/response-map-generator.ts';

await generateClient({
  api: './openapi.yaml',
  output: './src/api/client.ts',
  customGenerators: [responseMap],
  generators: ['typescript', 'response-map'],
});
```

### Code samples for docs

A generator that can call an operation can also document the operation.
Implement the optional `sample(operation, ctx)` hook to return one idiomatic snippet (`{ lang, label, source }`) for each operation.
With `codeSamples: true` in the `client` block, generation collects the samples of every selected generator into `<output>.code-samples.yaml`.
This file is an [OpenAPI Overlay](https://spec.openapis.org/overlay/latest.html) that adds `x-codeSamples` to each operation.
Docs tooling can apply the file.

The built-in `typescript` generator implements the hook.
If you only set the flag, your Redoc docs get a TypeScript example for each operation.
These examples always agree with the SDK.

The built-in generators are also readable models: each one is a source folder that imports only the public entries (the package root, its printer, and its contract), and `redocly eject-generator <name>` hands you that folder.
For a small artifact, the runnable examples at the end of this page are the quicker starting point.
They use only the public toolkit.

### Reference documentation for what you generate

Implement the optional `docs(input)` hook to return the reference page for your output, with the same `{ path, content }` shape as `run`.
The command calls it only when `client.docs` (or `--docs`) is on, so documentation is one switch for the whole run.

A generator documents itself, because nothing else knows its call syntax.
The `renderReferencePage(model, options)` helper renders the standard page, and it takes your `sample` hook for the snippets:

```js
import { defineGenerator, renderReferencePage } from '@redocly/client-generator';

const rubyCall = (operation) => ({ lang: 'ruby', source: `client.${operation.name}` });

export default defineGenerator({
  name: 'ruby',
  run({ model, output }) {
    /* the SDK */
  },
  sample: rubyCall,
  docs({ model, output, emit, pagination }) {
    return [
      {
        path: output.path.replace(/\.[^.\\/]+$/, '.ruby.md'),
        content: renderReferencePage(model, {
          title: `${model.title} Ruby SDK reference`,
          frontmatter: emit.docsFrontmatter === true,
          language: {
            name: 'ruby',
            label: 'Ruby',
            fence: 'ruby',
            requires: 'The SDK needs `faraday`.',
          },
          sample: rubyCall,
          // `pagination` is the run's resolved map; the page marks these operations as paginated.
          paginated: new Set(pagination?.keys() ?? []),
        }),
      },
    ];
  },
});
```

Write your own page instead if the standard layout does not fit: the hook returns files, so the content is yours.
An ejected generator keeps its `docs` hook, so the page layout is ejectable with the generator that owns it.

### Recipes

The built-in generators cover the common targets, and a custom generator covers the rest.
These are the shapes people ask for most often, each a file you copy rather than a product to wait for.

**A schema library the built-ins do not cover.**
The built-in `zod` generator emits Zod schemas.
For another library, walk `model.schemas` and print the expression that library expects.
`flattenAllOf` merges `allOf` compositions into one property list, `enumValues` returns the values of an enum, and `metadata.format` tells you when a string is really binary content.
The [`valibot-generator` example](https://github.com/Redocly/redocly-cli/tree/main/tests/e2e/generate-client/examples/valibot-generator) does this in about 60 lines, and it type-checks against the real library in our CI.

**A framework wrapper.**
The built-in `tanstack-query` and `swr` generators forward to the client's operation functions.
A wrapper for another framework is the same job: read the operations, emit one function or hook per operation, and forward to the generated call.
Declare `requires: ['typescript']` so the client it wraps is always there, and `errorModes: ['throw']` if the wrapper expects a thrown error.

**A shape your codebase already uses.**
A resource facade, a permissions matrix, a route map, a fixtures file.
The [`nested-facade`](https://github.com/Redocly/redocly-cli/tree/main/tests/e2e/generate-client/examples/nested-facade) and [`custom-generator`](https://github.com/Redocly/redocly-cli/tree/main/tests/e2e/generate-client/examples/custom-generator) examples are two of these.

**A change to a built-in generator, not a new one.**
Start from its code instead of a blank file: `redocly eject-generator <name>` writes the built-in into your repository, with its design as an agent skill, and an unmodified copy produces byte-identical output.
This is the shorter path whenever your requirement is "the built-in output, but different".

Every one of these runs in the same pass as the built-ins, reads the same API model, and adds no dependency to the generated client.

Import-specifier generators execute at generation time.
They have the same trust level as any installed dependency that you run.

## Resources

- **[`valibot-generator` example](https://github.com/Redocly/redocly-cli/tree/main/tests/e2e/generate-client/examples/valibot-generator)** - Copy a ~60-line generator that emits schemas for a validation library the built-ins do not cover
- **[`typescript-types-generator` example](https://github.com/Redocly/redocly-cli/tree/main/tests/e2e/generate-client/examples/typescript-types-generator)** - Learn how to use the runnable plugin based on `tsType` and how to type-import referenced schemas
- **[`custom-generator` example](https://github.com/Redocly/redocly-cli/tree/main/tests/e2e/generate-client/examples/custom-generator)** - An example of minimal generator that builds strings
- **[`nested-facade` example](https://github.com/Redocly/redocly-cli/tree/main/tests/e2e/generate-client/examples/nested-facade)** - An example of a realistic generator that derives an `api.<resource>.<operation>` facade from the description's tags.
- **[`generate-client` command](../commands/generate-client.md)** - flags, output modes, and invocation
- **[`client` configuration](../configuration/reference/client.md)** - Learn about the the `generate-client` command's flags, output modes, and invocation
- **[Use the generated client](./use-generated-client.md)** - Learn how to use the client produced by the `generate-client` command
