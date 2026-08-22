---
name: transformers-generator
description: Design of the ejected Redocly `transformers` client generator. Read it, and update it, before changing generators/transformers/.
---

# The `transformers` generator — its skill

This file is the DESIGN of your ejected `transformers` generator (`generators/transformers/`):
**to change the generator, edit this skill first, then make the code match it** — a diff
to `generators/transformers/` that has no covering sentence here is incomplete.

## What it emits

Per-schema `to<Name>()` / `from<Name>()` converters that turn wire JSON into typed
values and back — the bridge for `dateType: Date` clients.

## Design decisions that must hold

- **Requires `dateType: Date`** (declared as `dateTypes: ['Date']`, so a mismatched
  selection fails fast): the converters assign `Date` objects to fields the sdk types as
  `Date`, which only type-checks in that mode.
- **Imports the sdk's schema TYPES** (so `typescript` is required) and nothing else.
- Converters are pure and total: every named schema gets a pair, nested structures
  recurse, and a missing optional stays missing.

## Emitters that implement it

`emitters/transformers.ts`.

## Ejecting it

`redocly eject-generator transformers` ships this generator BUNDLED with the emitter it
uses — one small `.mjs` you own, importing `@redocly/client-generator` and
`@redocly/openapi-core`. Change which fields are converted, or how, and regenerate.

## The modify loop

1. Edit this skill: state the new behavior or decision.
2. Make `generators/transformers/` match it.
3. Run `redocly generate-client` and inspect the `git diff` of the generated output —
   generated files are never hand-edited.

Newer built-in versions merge in with `redocly eject-generator transformers --update`.
