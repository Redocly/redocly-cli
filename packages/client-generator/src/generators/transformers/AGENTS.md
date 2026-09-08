# The `transformers` generator — its skill

This file is the generator's DESIGN and governs our own changes: **to change the
generator, edit this skill first, then make the code match it.**

`npm run prepare` compiles it into `eject-assets/skills/transformers-generator/SKILL.md`,
the copy that ships to users — that asset is generated, so never edit it by hand.

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

## The stage files

`render.ts` holds the whole converter renderer; `index.ts` is the entry. Naming comes
from the TypeScript printer (`@redocly/client-generator/printers/typescript`).

## Ejecting it

`redocly eject-generator transformers` copies this generator's TypeScript source folder
to `generators/transformers/`, exactly as we wrote it, importing
`@redocly/client-generator` and `@redocly/client-generator/printers/typescript`. Running
a `.ts` generator uses Node's type stripping (Node 22.18, 23.6, or newer); newer built-in
versions merge in per file with `--update`. Change which fields are converted, or how,
and regenerate.

## The modify loop

1. Edit this skill: state the new behavior or decision.
2. Change the stage files named above (the entry is plumbing — it rarely moves).
3. Verify: `npm run compile`, the folder's unit suites
   (`VITEST_SUITE=unit npx vitest run packages/client-generator/src/generators/transformers`),
   the e2e suites for this generator, and the large-description bars
   (`tests/e2e/generate-client/large-descriptions.test.ts`).
