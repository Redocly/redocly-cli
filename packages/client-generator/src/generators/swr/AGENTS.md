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

## Ejecting it

`redocly eject-generator swr` ships this generator BUNDLED with the emitter it uses — one
small `.mjs` you own, importing `@redocly/client-generator` and `@redocly/openapi-core`.
Change the hook shape or the key strategy, and regenerate.

## The modify loop

1. Edit this skill: state the new behavior or decision.
2. Change the emitter modules named above (the entry is plumbing — it rarely moves).
3. Verify: `npm run compile`, the emitter unit suites
   (`VITEST_SUITE=unit npx vitest run packages/client-generator/src/emitters`), the e2e
   suites for this generator, and the large-description bars
   (`tests/e2e/generate-client/large-descriptions.test.ts`).
