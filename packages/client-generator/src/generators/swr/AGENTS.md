# The `swr` generator — its skill

This file is the generator's DESIGN and governs our own changes: **to change the
generator, edit this skill first, then make the code match it.**

## What it emits

React SWR hooks over the sdk's exported operation functions: `use<Op>()` with a
`<op>Key()` key factory for queries, `useSWRMutation` for mutations.

## Design decisions that must hold

- **Wraps the sdk's functions** — it never re-implements requests, so it requires `sdk`
  and is throw-mode only.
- **Keys are exported factories** so consumers can invalidate precisely.
- **`envelope` is excluded** from hook options (`Omit<RequestOptions, "envelope">`) and
  stripped from the forwarded call: cached data is always the plain body.
- **Skips what it cannot wrap** — SSE operations and `<Op>Variables` name collisions —
  with a warning naming each one, never silently.

## Emitters that implement it

`emitters/swr.ts`, `wrapper-support.ts` (shared wrappable-operation policy).

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
