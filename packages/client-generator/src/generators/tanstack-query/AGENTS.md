# The `tanstack-query` generator — its skill

This file is the generator's DESIGN and governs our own changes: **to change the
generator, edit this skill first, then make the code match it.**

## What it emits

Query/mutation option factories for TanStack Query — `<op>Options()`,
`<op>Mutation()`, and `<op>InfiniteOptions()` for paginated operations — plus exported
query keys. One generator, four framework variants (`react` default, `-vue`,
`-svelte`, `-solid`) differing only in the imported package.

## Design decisions that must hold

- **Options factories, not hooks:** consumers call `useQuery(<op>Options(...))`, so the
  output works with any of the framework adapters and stays testable.
- **`queryKeyPrefix`** namespaces every key when several clients share a cache.
- **Infinite queries** derive `getNextPageParam` from the resolved pagination rule; a
  `link`-style rule reads the `Link` header the descriptor declares.
- **`envelope` is excluded and stripped** — cached data is the plain body.
- Requires `sdk`; throw-mode only (it wraps thrown errors into query errors).

## Emitters that implement it

`emitters/tanstack-query.ts`, `wrapper-support.ts`, `pagination.ts`.

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
