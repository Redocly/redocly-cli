# The `mock` generator — its skill

This file is the generator's DESIGN and governs our own changes: **to change the
generator, edit this skill first, then make the code match it.**

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
