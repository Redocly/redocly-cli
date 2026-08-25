---
name: zod-generator
description: Design of the ejected Redocly `zod` client generator. Read it, and update it, before changing generators/zod/.
---

# The `zod` generator — its skill

This file is the DESIGN of your ejected `zod` generator (`generators/zod/`):
**to change the generator, edit this skill first, then make the code match it** — a diff
to `generators/zod/` that has no covering sentence here is incomplete.

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
2. Make `generators/zod/` match it.
3. Run `redocly generate-client` and inspect the `git diff` of the generated output —
   generated files are never hand-edited.

Newer built-in versions merge in with `redocly eject-generator zod --update`.
