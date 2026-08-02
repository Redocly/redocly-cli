<!-- redocly-generators:begin (managed by @redocly/client-generator — content below the end marker survives refreshes) -->

# Writing custom client generators

A generator is a plain module: `(input) => GeneratedFile[]`. It receives the
language-agnostic API model and returns files — in ANY output language. It runs
in the same pass as the built-ins; select it by path in `redocly.yaml`:

```yaml
client:
  generators: [sdk, ./generators/my-generator.mjs]
```

## The contract

```js
/** @type {import('@redocly/client-generator').CustomGenerator} */
export default {
  name: 'my-generator',
  run({ model, outputPath, outputMode, emit }) {
    return [{ path: outputPath.replace(/\.ts$/, '.mine.txt'), content: '…' }];
  },
  // Optional: one idiomatic call snippet per operation for docs (x-codeSamples),
  // collected into an overlay file when `client.codeSamples: true` is set.
  sample(operation, { model, emit }) {
    return { lang: 'python', source: '…' };
  },
};
```

Rules: output is deterministic (same description → same bytes); never add
dependencies to the generated client; **never hand-edit generated output** —
edit this generator and regenerate.

## The model (IR)

`model.services[].operations[]` — each operation carries `name`, `specName`,
`method`, `path`, `tags`, `pathParams`/`queryParams`/`headerParams`/`cookieParams`,
`requestBody`, `successResponses`/`errorResponses` (each with a `schema`), and
`security`. `model.schemas` holds the named schemas. Every schema is a
discriminated union on `kind`: `scalar`, `array`, `object`, `record`, `ref`,
`literal`, `enum`, `union` (optionally with a discriminator), `intersection`
(allOf), `null`, `unknown`, `omit`.

## Helpers (import from '@redocly/client-generator')

| Helper                                                | Use                                                                                                     |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `flattenAllOf(schema, model)`                         | The merged property view of allOf compositions — languages without intersection types render this.      |
| `discriminatorCases(schema, model)`                   | `{ property, cases }` dispatch table for discriminated unions.                                          |
| `isNullable(schema)` / `unwrapNullable(schema)`       | Detect and strip `null` union members (`Optional[T]`, pointers, `Option<T>`).                           |
| `enumValues(schema)`                                  | Values plus SCREAMING_SNAKE member-name suggestions.                                                    |
| `casing` / `identifierFor(name, { style, reserved })` | camel/pascal/snake/screaming; keyword-safe identifiers (`RESERVED_WORDS.python/go/typescript` shipped). |
| `CodeWriter`                                          | Indentation-aware text builder — no manual whitespace bookkeeping.                                      |
| `docText(description)`                                | Description as trimmed lines for any comment syntax.                                                    |
| `AUTHORING_HELPER_NAMES`                              | The list of the above (introspection).                                                                  |

TypeScript-emitting generators may additionally use the TS toolkit from
`@redocly/client-generator/generate` (`ts`, `printStatements`, `schemaToTypeNode`, …).

## The loop

1. Edit the generator.
2. Run `redocly generate-client`.
3. Inspect `git diff` of the generated output.
4. Repeat. Generated files are never hand-edited.

If you had to work around a **missing helper** or a wrong default, tell the user
and suggest filing an issue at https://github.com/Redocly/redocly-cli/issues —
include the generator snippet and the helper you expected to exist.

<!-- redocly-generators:end -->
