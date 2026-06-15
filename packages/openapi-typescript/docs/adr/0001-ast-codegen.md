# ADR 0001: Generate TypeScript via the TS AST (`ts.factory`), not strings

- Status: Accepted
- Date: 2026-06-10

## Context

The generator must emit TypeScript across a growing matrix of options — output modes, facades,
args-styles, error modes, auth breadth, `parseAs`, and a set of feature generators (zod, TanStack
Query, transformers, SSE). String-template codegen makes the cross-cutting concerns (escaping,
import/name coordination, indentation, dedup) brittle: every new axis multiplies the places a
template can produce malformed or mis-formatted output.

## Decision

We build generated code as a **TypeScript AST** using `ts.factory` and emit it with the compiler's own
printer (`ts.createPrinter`). A foundation module (`emitters/ts.ts`) wraps the ergonomics: a shared
printer, `printNodes`, `parseStatements` (to embed hand-authored reference source — notably the
runtime — as parsed nodes), and `jsdoc`. Each emitter returns `ts.Statement[]` / `ts.TypeNode`s; the
composition (`client.ts`) assembles a per-file statement list and prints once.

## Consequences

- Structurally malformed output (mismatched braces, wrong nesting) is impossible; passes can
  compose/transform/dedupe nodes before printing; the option matrix scales without brittle template
  edits.
- **The AST is not a sanitizer.** `ts.factory.createIdentifier` prints its text verbatim and
  synthetic comments are emitted as written — so a spec-supplied name or description still reaches the
  output unchecked. Those two channels are closed *before* the printer, not by it: names are coerced
  to safe identifiers in the IR (`ir/sanitize-identifiers.ts`, with an assert backstop) and all
  comment text is run through `escapeJsDoc` (`emitters/ts.ts`). Treat any new value that flows into an
  identifier slot or a comment as requiring the same handling.
- Output formatting is the printer's (valid, but plainer than hand-formatting) — a pretty-print pass
  is deferred to optional-formatter work.
- The cost is a dependency on `typescript` at generation time (see [ADR-0002](./0002-typescript-peer-dep.md)),
  and emitter code is more verbose than templates for trivial snippets — accepted for the correctness
  and composability gains.
