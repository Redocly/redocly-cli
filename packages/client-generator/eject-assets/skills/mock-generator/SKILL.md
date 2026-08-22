---
name: mock-generator
description: Design of the ejected Redocly `mock` client generator. Read it, and update it, before changing generators/mock/.
---

# The `mock` generator — its skill

This file is the DESIGN of your ejected `mock` generator (`generators/mock/`):
**to change the generator, edit this skill first, then make the code match it** — a diff
to `generators/mock/` that has no covering sentence here is incomplete.

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

## Emitters that implement it

`emitters/mock.ts`, `mock-value.ts` (data trees), `faker.ts`, `sample.ts`.

## Ejecting it

`redocly eject-generator mock` ships this generator BUNDLED with the emitter it uses — one
small `.mjs` you own, importing `@redocly/client-generator` and `@redocly/openapi-core`.
Change the data strategy, the handler shape, or the factory surface, and regenerate.

## The modify loop

1. Edit this skill: state the new behavior or decision.
2. Make `generators/mock/` match it.
3. Run `redocly generate-client` and inspect the `git diff` of the generated output —
   generated files are never hand-edited.

Newer built-in versions merge in with `redocly eject-generator mock --update`.
