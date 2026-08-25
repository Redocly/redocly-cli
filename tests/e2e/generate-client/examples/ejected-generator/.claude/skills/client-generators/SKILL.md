---
name: client-generators
description: Write or change a Redocly client generator — the API model, the language-neutral helper toolkit, and the edit → regenerate → diff loop.
---

# Writing custom client generators

A generator is a plain module: `(input) => GeneratedFile[]`. It receives the
language-agnostic API model and returns files — in ANY output language. It runs
in the same pass as the built-ins; select it by path in `redocly.yaml`:

```yaml
client:
  generators: [typescript, ./generators/my-generator.mjs]
```

## The contract

```js
/** @type {import('@redocly/client-generator').CustomGenerator} */
export default {
  name: 'my-generator',
  run({ model, output, outputMode, emit }) {
    return [{ path: output.path.replace(/\.ts$/, '.mine.txt'), content: '…' }];
  },
  // Optional: one idiomatic call snippet per operation for docs (x-codeSamples),
  // collected into an overlay file when `client.codeSamples: true` is set.
  sample(operation, { model, emit }) {
    return { lang: 'python', source: '…' };
  },
  // Optional: the reference page for what `run` emits, written when `client.docs` (or
  // --docs) is on. Same `{ path, content }` shape as `run`; `renderReferencePage` gives
  // the standard layout and takes `sample` for its snippets. A generator documents itself.
  docs({ model, output, emit }) {
    return [{ path: output.path.replace(/\.ts$/, '.mine.md'), content: '…' }];
  },
};
```

## Declaring options

A generator that needs configuration declares it as a schema; `run` then receives
`options` already validated, with defaults applied:

```js
export default {
  name: 'permissions-matrix',
  options: {
    type: 'object',
    properties: { groupBy: { enum: ['tag', 'path'], default: 'tag' } },
    additionalProperties: false,
  },
  run({ model, output, options }) {
    return [
      { path: output.path.replace(/\.ts$/, '.permissions.md'), content: render(options.groupBy) },
    ];
  },
};
```

Users set them per generator name:

```yaml
client:
  generators: [typescript, ./generators/permissions-matrix.mjs]
  options:
    permissions-matrix:
      groupBy: path
```

The supported subset is a top-level `type: 'object'` with `properties`, `required`, and
`additionalProperties`; each property is a scalar (`string`/`number`/`boolean`), an
`enum`, or an array of scalars, and may carry a `default` and a `description`. Don't
validate options inside `run` — an unknown key, a wrong type, a value outside an `enum`,
or a missing `required` key already fails generation before `run` is called.

Rules: output is deterministic (same description → same bytes); never add
dependencies to the generated client; **never hand-edit generated output** —
edit this generator and regenerate. Emitted file paths must stay inside the
`--output` directory (subdirectories are fine) — escapes are rejected.
Optionally declare `requiresGenerator` — the `@redocly/client-generator` version
range you wrote this against (`'^1.2.0'`, `'~1.2.0'`, `'>=1.2.0'`, or an exact
version). A CLI outside the range then fails with the fix path instead of feeding
your generator an unexpected model shape. Ejected generators carry it
automatically; hand-written ones without it are taken as current.

## The model (IR)

`model.services[].operations[]` — each operation carries `name`, `specName`,
`method`, `path`, `tags`, `pathParams`/`queryParams`/`headerParams`/`cookieParams`,
`requestBody`, `successResponses`/`errorResponses` (each with a `schema`), and
`security`. `model.schemas` holds the named schemas. Every schema is a
discriminated union on `kind`: `scalar`, `array`, `object`, `record`, `ref`,
`literal`, `enum`, `union` (optionally with a discriminator), `intersection`
(allOf), `null`, `unknown`, `omit`.

## Helpers (import from '@redocly/client-generator')

| Helper                                                  | Use                                                                                                                              |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `flattenAllOf(schema, model)`                           | The merged property view of allOf compositions — languages without intersection types render this.                               |
| `deref(schema, model)`                                  | Follow a `ref` chain to the schema it names (cycle-guarded).                                                                     |
| `jsonSuccessSchema(op)` / `sseResponse(op)`             | The primary JSON success schema; the `text/event-stream` response when the operation streams.                                    |
| `isMultipartBody(op)`                                   | Whether the request body is multipart.                                                                                           |
| `serverUrlParts(server)`                                | A server-URL template as literal/variable parts, ready for any concatenation syntax.                                             |
| `securityRequirements(op, model)`                       | The operation's security as OR-alternatives of AND-sets, denormalized against the declared schemes.                              |
| `paginationItemSchema(pageSchema, itemsPointer, model)` | The raw element schema behind a pagination rule's `items` pointer — a `ref` element keeps its name.                              |
| `discriminatorCases(schema, model)`                     | `{ property, cases }` dispatch table for discriminated unions.                                                                   |
| `isNullable(schema)` / `unwrapNullable(schema)`         | Detect and strip `null` union members (`Optional[T]`, pointers, `Option<T>`).                                                    |
| `enumValues(schema)`                                    | Values plus SCREAMING_SNAKE member-name suggestions.                                                                             |
| `headerCoerceType(schema, model)`                       | Response-header coerce hint (`integer`/`number`/`boolean`/`string`) through refs, nullables, and allOf wrappers.                 |
| `casing` / `identifierFor(name, { style, reserved })`   | camel/pascal/snake/screaming; keyword-safe identifiers (`RESERVED_WORDS.python/go/typescript` shipped).                          |
| `uniqueIdentifiers(names, { style, reserved, taken })`  | The same, made unique among themselves and among names you already took — for a signature that takes one argument per parameter. |
| `Printer`                                               | Indentation-aware text builder — no manual whitespace bookkeeping.                                                               |
| `docText(description)`                                  | Description as trimmed lines for any comment syntax.                                                                             |
| `schemaAtPointer(schema, pointer, model)`               | Resolve an RFC 6901 JSON pointer over a schema (through refs and allOf) — e.g. a pagination `items` pointer to its element type. |
| `paginationRuleFor(op, config)`                         | The pagination rule that applies to an operation (per-op config > extension > fitting convention), normalized.                   |
| `renderReferencePage(model, options)`                   | The Markdown reference page a generator's `docs` hook returns — your `sample` hook supplies its call snippets.                   |
| `NotSupportedError`                                     | Throw it to reject an option the generator can't honor — the CLI prints the message as a user error, not a crash.                |
| `AUTHORING_HELPER_NAMES`                                | The list of the above (introspection).                                                                                           |

Worked example: the built-in `python` generator
(`packages/client-generator/src/generators/python/index.ts` in the Redocly CLI repo) is
authored with exactly this toolkit and nothing else — models via `flattenAllOf`/
`enumValues`/`discriminatorCases`, all code through `Printer`, every name through
`identifierFor(..., RESERVED_WORDS.python)`.

A generator that emits TypeScript may additionally use the source-text renderers from
`@redocly/client-generator/generate` — `tsType` (schema → type), `tsJsdoc`, `codeLiteral`,
`operationSignature`, `pascalCase`, `safeIdent`. There is no AST toolkit and no
`typescript` dependency: every generator prints text through `Printer`.

## The loop

1. Edit the generator.
2. Run `redocly generate-client`.
3. Inspect `git diff` of the generated output.
4. Repeat. Generated files are never hand-edited.

If you had to work around a **missing helper** or a wrong default, tell the user
and suggest filing an issue at https://github.com/Redocly/redocly-cli/issues —
include the generator snippet and the helper you expected to exist.
