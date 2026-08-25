# The `mock` generator — its skill

This file is the generator's DESIGN and governs our own changes: **to change the
generator, edit this skill first, then make the code match it.**

`npm run prepare` compiles it into `eject-assets/skills/mock-generator/SKILL.md`,
the copy that ships to users — that asset is generated, so never edit it by hand.

## What it emits

A standalone MSW module: `create<Name>()` data factories, `<op>Handler()` /
`<op>ErrorHandler(status, body?)` request handlers, and a `handlers` array.

## Design decisions that must hold

- **Two data modes:** `mockData: static` bakes deterministic samples from the schema
  (examples/defaults first); `faker` emits `faker.*` calls with a seed (`mockSeed`) so
  runs are reproducible.
- **Interpolated identifiers are gated** (`codeIdent`): an operation name or method
  reaching a code position is validated, never trusted, even though the pipeline
  sanitizes upstream.
- Handlers are opt-in overrides: `<op>ErrorHandler` is NOT in `handlers`.
- The module references the sdk's TYPES only — never its runtime.

## The stage files

`render.ts` assembles the module (factories, handlers, the `handlers` array);
`sample.ts` bakes deterministic sample values from the schema, `values.ts` renders the
data trees, and `faker.ts` emits the faker-mode expressions. `index.ts` is the entry.

## Ejecting it

`redocly eject-generator mock` copies this generator's TypeScript source folder to
`generators/mock/`, exactly as we wrote it, importing `@redocly/client-generator`,
`@redocly/client-generator/printers/typescript`, and `@redocly/openapi-core`. Running a
`.ts` generator uses Node's type stripping (Node 22.18, 23.6, or newer); newer built-in
versions merge in per file with `--update`. Change the data strategy, the handler shape,
or the factory surface, and regenerate.

## The modify loop

1. Edit this skill: state the new behavior or decision.
2. Change the stage files named above (the entry is plumbing — it rarely moves).
3. Verify: `npm run compile`, the folder's unit suites
   (`VITEST_SUITE=unit npx vitest run packages/client-generator/src/generators/mock`),
   the e2e suites for this generator, and the large-description bars
   (`tests/e2e/generate-client/large-descriptions.test.ts`).
