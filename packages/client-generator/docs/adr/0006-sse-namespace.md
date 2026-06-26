# ADR 0006: SSE as a derived response kind under an `sse.*` namespace

- Status: Accepted
- Date: 2026-06-10

## Context

Some operations stream Server-Sent Events (`text/event-stream`).
These don't fit the one-shot request/response shape: they return an async iterator of typed events, need reconnection (`Last-Event-ID` + backoff), and are errorMode-agnostic.
We must surface them without complicating ordinary operations or the default output.

## Decision

SSE is a **derived response kind**, detected (not flagged) by `emitters/sse.ts` (`isSseOp`/`partitionOps`): an operation whose 2xx response declares `text/event-stream` is emitted under a separate **`sse` namespace** instead of as a plain endpoint.
The runtime gains a **gated** `__sse<T>` generator — an `async function*` that **reuses `__send`** for the initial request + retry/auth, then parses event frames and auto-reconnects via `Last-Event-ID`.
The event payload type `T` comes from the response `itemSchema` → media `schema` → `string`.
`client.ts` partitions each service's ops and exposes the SSE ones under `sse` (functions: `export const sse = { … }`; service-class: a bound `readonly sse = { … }`); in multi-file modes each tag/class contributes a `__sse_<Class>` fragment that the barrel merges.

## Consequences

- Streaming ops get an ergonomic, typed async-iterator surface without touching ordinary operations.
- The whole `__sse`/`ServerSentEvent`/`SseOptions` block is **gated off** when no op streams, so non-SSE clients are byte-identical (no churn).
- SSE bypasses the error-mode terminals ([ADR-0005](./0005-error-mode-terminals.md)) by design — it has no `Result` form.
