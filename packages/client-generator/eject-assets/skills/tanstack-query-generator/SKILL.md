---
name: tanstack-query-generator
description: Design of the ejected Redocly `tanstack-query` client generator. Read it, and update it, before changing generators/tanstack-query/.
---

# The `tanstack-query` generator — its skill

This file is the DESIGN of your ejected `tanstack-query` generator (`generators/tanstack-query/`):
**to change the generator, edit this skill first, then make the code match it** — a diff
to `generators/tanstack-query/` that has no covering sentence here is incomplete.

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
- Requires `typescript`; throw-mode only (it wraps thrown errors into query errors).

## The stage files

`render.ts` holds the whole factory renderer; `index.ts` is the entry (the framework is
its one argument). The wrappable-operation policy and the sdk calling convention come
from the typescript generator's published contract
(`@redocly/client-generator/contracts/typescript`); the resolved pagination arrives from
the pipeline on the generator input.

## Ejecting it

`redocly eject-generator tanstack-query` copies this generator's TypeScript source folder
to `generators/tanstack-query/`, exactly as we wrote it, importing
`@redocly/client-generator`, `@redocly/client-generator/printers/typescript`, and
`@redocly/client-generator/contracts/typescript`. Running a `.ts` generator uses Node's
type stripping (Node 22.18, 23.6, or newer); newer built-in versions merge in per file
with `--update`. The framework is a single argument in the ejected `index.ts` default
export (`tanstackQueryGenerator('react')`), so switch it to `'vue'`, `'svelte'`, or
`'solid'` there instead of ejecting four near-identical copies.

## The modify loop

1. Edit this skill: state the new behavior or decision.
2. Make `generators/tanstack-query/` match it.
3. Run `redocly generate-client` and inspect the `git diff` of the generated output —
   generated files are never hand-edited.

Newer built-in versions merge in with `redocly eject-generator tanstack-query --update`.
