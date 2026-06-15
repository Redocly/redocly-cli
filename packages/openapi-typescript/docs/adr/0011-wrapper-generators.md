# ADR 0011: Data-fetching wrapper generators (`swr`, `tanstack-query`)

- Status: Accepted
- Date: 2026-06-13

## Context

The sdk emits framework-agnostic `async function`s. Application code that uses
[TanStack Query](https://tanstack.com/query) or [SWR](https://swr.vercel.app) then hand-writes the
same glue per operation — query keys, `queryFn`/fetcher wrappers, mutation factories — which drifts
from the spec and is exactly the boilerplate a generator should own. Two questions had to be
answered without compromising the dependency-free client ([ADR-0002](./0002-typescript-peer-dep.md)):
how the wrappers stay in step with the sdk's calling convention, and how to support multiple
frameworks (TanStack ships `react`/`vue`/`svelte`/`solid` adapters) without four near-copies.

## Decision

Each wrapper is a **registry generator** ([ADR-0004](./0004-registry-seams.md)) emitting a separate
`*.tanstack.ts` / `*.swr.ts` module that imports the framework peer and **forwards to the sdk's
exported functions** — the client never imports the framework. Both wrappers derive their argument
order from the shared `operation-signature.ts`, so a forwarding call lines up with the sdk by
construction.

Their cross-cutting agreement — which operations are wrappable (skip SSE; skip `<Op>Variables`
name collisions) and the `vars`/`init` parameter shape — lives in one shared `wrapper-support.ts`,
so the two emitters (and any third adapter) cannot diverge.

For TanStack's multiple frameworks, the **emitted factory module is byte-identical across
frameworks** — `queryOptions` and the mutation shape are framework-agnostic — so the only
difference is the import specifier. `--query-framework` selects it (`@tanstack/<framework>-query`),
rather than forking the generator per framework.

Wrappers wrap the **throw-mode** sdk (TanStack/SWR expect the fetcher to throw), so they require
`--error-mode throw` and the `functions` facade; the generator contract fails fast otherwise.

## Consequences

- Adding a third wrapper (e.g. another fetching library) reuses `wrapper-support.ts` and
  `operation-signature.ts` — only the per-operation factory bodies are new.
- TanStack framework support costs one import-specifier switch, not a code path per framework.
- The client stays dependency-free; the framework is a peer of the wrapper module only.
- SSE operations and `<Op>Variables` schema collisions are skipped with a logged notice rather than
  emitting a module that won't compile.
- Vercel/Next.js-specific data fetching is intentionally out of scope (SWR covers the React-Query
  alternative); revisit only if there is concrete demand.
