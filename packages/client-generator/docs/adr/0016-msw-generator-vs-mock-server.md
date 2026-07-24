# ADR 0016: In-process MSW mocks (generated) coexist with the out-of-process mock server

- Status: Accepted
- Date: 2026-07-03

## Context

Two mocking mechanisms exist in this repo, and it recurs in review whether they are redundant — "why not use `@redocly/mock-server` for every mocking use case, and drop the generated [MSW](https://mswjs.io) handlers (and `faker`)?"

They sit on **two orthogonal axes**, which the "redundant?" question conflates:

1. **Where interception happens** — this ADR.
   - **Generated MSW handlers** (`mock` generator, `*.mocks.ts`): run **in-process** and intercept the client's real `fetch` transparently. No change to where the client points; no port, no separate process. Work in a browser (service worker) and inside test workers (Vitest/jsdom, Storybook, Playwright-CT).
   - **`@redocly/mock-server`**: a **separate HTTP process** on a port, serving spec-derived responses. The client must point its `baseUrl` at it. Language-agnostic and exercises the **real transport** (real `fetch` round-trip, real `AbortController`, real headers).
2. **What data is returned** — already settled by [ADR-0010](./0010-mock-data-baked-vs-faker.md): `baked` deterministic literals (default) vs. `faker` realistic data; the mock server independently serves spec `example` values. This axis is _not_ the subject here.

The dominant consumer of a generated TypeScript SDK is application code (React/Vue/…) whose testing and local-dev story is **in-process fetch interception** — which is precisely what MSW is, and what comparable generators emit, because it is the ecosystem norm. Booting a Node HTTP server inside each frontend test worker is heavier, flake-prone (port lifecycle), impossible in a browser worker, and loses transparent interception (the client's `baseUrl` must be redirected).

The mock server's strengths are the mirror image: real transport (why this repo's own runtime-tier tests — `tests/e2e/generate-client/base.test.ts` / `cafe.test.ts` — run the generated client against it), a shared team/staging-like instance, and cross-language clients. Using the _generated_ mock as the harness for the _sdk_ generator's own runtime test would also be circular — a mock-generator bug could mask or cause an sdk-test failure — so the independent, spec-driven server is the trustworthy double there.

## Decision

Keep **both**, as complementary tools for different interception points; do not fold one into the other.

- The **`mock` generator** owns **in-process** mocking: type-safe MSW handlers + data factories, co-located in the consumer's repo, overridable per test (`server.use(...)`), zero infra, browser- and test-worker-capable. It stays dependency-free for the client itself — `msw`/`@faker-js/faker` appear only in the emitted `*.mocks.ts`, never in the client ([ADR-0002](./0002-typescript-peer-dep.md), [ADR-0010](./0010-mock-data-baked-vs-faker.md)).
- **`@redocly/mock-server`** owns **out-of-process** mocking: real-transport, language-agnostic, shared-instance scenarios — and is the independent double for this repo's runtime test tier.

Neither mechanism can cover the other's primary use case well, so neither is dropped.

## Consequences

- The SDK's primary audience (frontend app + test code) gets the mocking mode it actually reaches for, with no running process.
- Two mocking stories must be documented and maintained; this ADR is the reference for _why_, so the "just use the server" question does not get re-litigated per PR.
- The genuine trim lever, if surface must shrink, is the **data axis, not the mechanism axis**: `faker` (an extra opt-in mode + peer dep) is the most marginal piece — `baked` already covers the deterministic-test case, and realistic data is mostly a demo/Storybook nicety. Dropping `faker` would be defensible; dropping the MSW generator in favor of the server would remove the one mode the primary audience needs. Revisit `faker` only if its maintenance cost outweighs demand.
- The runtime test tier deliberately uses the independent mock server (not the generated mock) to keep sdk-failure blame unambiguous.
