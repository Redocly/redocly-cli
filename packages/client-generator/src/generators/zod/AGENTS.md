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

## Emitters that implement it

`emitters/zod.ts` (schema expressions + module assembly).

## Ejecting it

`redocly eject-generator zod` ships this generator BUNDLED with the emitter it uses — one
small `.mjs` you own, importing `@redocly/client-generator` and `@redocly/openapi-core`.
Change the schema shapes, the naming, or what gets a schema at all, and regenerate.

## The modify loop

1. Edit this skill: state the new behavior or decision.
2. Change the emitter modules named above (the entry is plumbing — it rarely moves).
3. Verify: `npm run compile`, the emitter unit suites
   (`VITEST_SUITE=unit npx vitest run packages/client-generator/src/emitters`), the e2e
   suites for this generator, and the large-description bars
   (`tests/e2e/generate-client/large-descriptions.test.ts`).
