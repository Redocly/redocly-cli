# The `transformers` generator — its skill

This file is the generator's DESIGN and governs our own changes: **to change the
generator, edit this skill first, then make the code match it.**

## What it emits

Per-schema `to<Name>()` / `from<Name>()` converters that turn wire JSON into typed
values and back — the bridge for `dateType: Date` clients.

## Design decisions that must hold

- **Requires `dateType: Date`** (declared as `dateTypes: ['Date']`, so a mismatched
  selection fails fast): the converters assign `Date` objects to fields the sdk types as
  `Date`, which only type-checks in that mode.
- **Imports the sdk's schema TYPES** (so `sdk` is required) and nothing else.
- Converters are pure and total: every named schema gets a pair, nested structures
  recurse, and a missing optional stays missing.

## Emitters that implement it

`emitters/transformers.ts`.

## Not ejectable — and the customization path

`redocly eject-generator` covers the standalone language SDKs (`python`, `go`, `php`),
whose entire generator is one self-contained file. This generator is a thin entry over
the SHARED TypeScript emitters listed above, so handing you a copy of the entry would
hand you nothing to customize. Customize the OUTPUT instead:

- `client.setup` bakes publisher defaults into the generated client.
- Middleware and `configure()` change behavior at runtime, not at generate time.
- A custom generator (`defineGenerator`) emits your own artifact beside the client.

Ask for a helper or a knob you're missing rather than working around it — that request
is the roadmap signal.

## The modify loop

1. Edit this skill: state the new behavior or decision.
2. Change the emitter modules named above (the entry is plumbing — it rarely moves).
3. Verify: `npm run compile`, the emitter unit suites
   (`VITEST_SUITE=unit npx vitest run packages/client-generator/src/emitters`), the e2e
   suites for this generator, and the large-description bars
   (`tests/e2e/generate-client/large-descriptions.test.ts`).
