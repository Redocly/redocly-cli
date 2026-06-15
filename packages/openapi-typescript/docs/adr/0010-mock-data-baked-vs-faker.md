# ADR 0010: Mock data — baked literals by default, faker opt-in

- Status: Accepted
- Date: 2026-06-13

## Context

The `mock` generator emits [MSW](https://mswjs.io) request handlers plus `create<Schema>` data
factories. Those factories need values to return. Two sources are reasonable, and they pull in
opposite directions:

- **Baked literals** — deterministic values synthesized from the schema (preferring `example` /
  `default`). Zero runtime dependency, reproducible by construction, but unrealistic ("string",
  `0`, the same UUID every time).
- **[`@faker-js/faker`](https://fakerjs.dev) calls** — realistic, varied data (names, emails,
  dates), at the cost of a dependency and (without a seed) non-determinism.

A mock generator that hard-codes either choice is wrong for half its users: test suites want
deterministic zero-dep fixtures; demos and Storybook want realistic data. The core constraint is
that the generated **client stays dependency-free** ([ADR-0002](./0002-typescript-peer-dep.md)) —
whatever mocks pull in must not leak into it.

## Decision

Make data source a knob — **`--mock-data baked` (default) | `faker`** — with **identical factory
signatures** in both modes, so a consumer flips it without touching call sites. Baked mode lives in
`emitters/sample.ts` (`sampleValue` → a JS value, printed as a literal); faker mode lives in
`emitters/faker.ts` (`fakerExpression` → a `ts.Expression` of `@faker-js/faker` calls). Both walk
the same IR with the same visited-set cycle guard, so they agree on shape; `--mock-seed <n>` emits
`faker.seed(n)` for reproducible faker output. The `@faker-js/faker` import appears only in the
`*.mocks.ts` module — never in the client.

A `$ref` cycle terminates in the **type-correct empty value** for its position (array → `[]`,
record → `{}`, optional property → omitted; only a required, non-container self-reference degrades
to `null`), shared by both modes, so mock data always satisfies the generated non-nullable types.

## Consequences

- Default output is zero-dependency and deterministic — safe for CI fixtures with no install.
- Realistic data is one flag away, and reproducible with `--mock-seed`, without changing how the
  factories are called.
- Two walkers (`emitters/sample.ts`, `emitters/faker.ts`) must be kept structurally in lockstep; the
  shared cycle semantics and a parallel test suite are what hold them together. Both live under
  `emitters/` (a mock concern, not the IR layer).
- `mock` requires the `sdk` generator (factories reference its types) and is validated by the
  generator contract ([ADR-0004](./0004-registry-seams.md)).
