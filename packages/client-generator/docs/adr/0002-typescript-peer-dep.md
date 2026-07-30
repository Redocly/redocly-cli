# ADR 0002: `typescript` as a peer dependency; zero-runtime-dependency output

- Status: Accepted
- Date: 2026-06-10

## Context

[ADR-0001](./0001-ast-codegen.md) makes `typescript` (for `ts.factory` + `ts.createPrinter`) a generation-time requirement.
We must decide how the package depends on it without (a) bloating installs for consumers who already have `typescript`, or (b) compromising the headline property that the **generated client has no runtime dependencies**.

## Decision

We declare `typescript` (`>=5.5.0`) as a **`peerDependency`** of `@redocly/client-generator`.
The only real runtime `dependency` is `@redocly/openapi-core` (the input/document side).
Package-in-code consumers (`import { generateClient }`) already have `typescript`; `@redocly/cli` declares it as a real `dependency` so the CLI works standalone (and transitively satisfies the peer).
The codegen uses only stable `factory` / `createPrinter` / `createSourceFile` / `SyntaxKind` APIs, so the wide peer range is safe.

## Consequences

- `typescript` is used **only at generation time** and never emitted, so the generated client stays dependency-free (web-standard APIs only: `fetch`, `AbortController`, `URLSearchParams`) and runs in browsers, Node, Bun, Deno, and edge runtimes.
- `@redocly/openapi-core` must **not** grow a TS code-builder — its `yaml-ast-parser` is the input AST, not an output one.
- Consumers in unusual setups may need to add `typescript` explicitly; the wide peer range keeps this rare.
