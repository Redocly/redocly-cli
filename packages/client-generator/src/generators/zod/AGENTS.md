# The `zod` generator — its skill

This file is the generator's DESIGN and governs our own changes: **to change the
generator, edit this skill first, then make the code match it.**

`npm run prepare` compiles it into `eject-assets/skills/zod-generator/SKILL.md`,
the copy that ships to users — that asset is generated, so never edit it by hand.

## What it emits

A standalone `<stem>.zod.ts`: one `export const <Name>Schema` per named IR schema, the
`operationSchemas` request/response map, and a `zodValidation()` middleware.

## Design decisions that must hold

- **The client stays dependency-free.** zod is the CONSUMER's peer dependency; the
  generated client never imports this module, and this module never imports the client.
- **Output-mode-agnostic:** one module beside the client whatever the sdk's layout.
- **Emits nothing** when the model has neither named schemas nor JSON operation bodies —
  an empty file is worse than no file.
- Validation is opt-in at runtime (`use(zodValidation())`), never automatic.
- **Only ERASABLE TypeScript.** The module must run under `node --experimental-strip-types`
  with no build step, so nothing that needs a transform is emitted: no `enum`, no
  `namespace`, and no constructor parameter properties. `ZodValidationError` therefore
  declares its fields and assigns them in the constructor body — `constructor(readonly
operationId: string)` fails strip-only mode, which is how the generated CLI broke when it
  imported this module.

## The stage files

`schemas.ts` holds the whole renderer — schema expressions, the `operationSchemas` map,
and the module assembly; `index.ts` is the entry. Naming and literal escaping come from
the TypeScript printer (`@redocly/client-generator/printers/typescript`).

## Ejecting it

`redocly eject-generator zod` copies this generator's TypeScript source folder to
`generators/zod/`, exactly as we wrote it, importing `@redocly/client-generator` and
`@redocly/client-generator/printers/typescript`. Running a `.ts` generator uses Node's
type stripping (Node 22.18, 23.6, or newer); newer built-in versions merge in per file
with `--update`. Change the schema shapes, the naming, or what gets a schema at all, and
regenerate.

## The modify loop

1. Edit this skill: state the new behavior or decision.
2. Change the stage files named above (the entry is plumbing — it rarely moves).
3. Verify: `npm run compile`, the folder's unit suites
   (`VITEST_SUITE=unit npx vitest run packages/client-generator/src/generators/zod`),
   the e2e suites for this generator, and the large-description bars
   (`tests/e2e/generate-client/large-descriptions.test.ts`).
