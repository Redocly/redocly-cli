# ADR 0005: Error handling as a generate-time mode (throw vs result)

- Status: Accepted
- Date: 2026-06-10

## Context

Consumers want different error-handling ergonomics: some prefer exceptions, others prefer a
discriminated `{ data, error }` result they must inspect. Encoding this **per call** (à la a
`throwOnError` flag) forces conditional-return overloads and complicates every operation signature. A
codebase generally picks one convention anyway.

## Decision

Error handling is a **generate-time mode** (`--error-mode throw | result`, default `throw`). The fetch
wrapper is factored into a shared core plus one of two terminals:

- `__send` — payload/header build + the retry/fetch loop → a raw `Response`; `__parse` — success-body
  decode.
- `__request` (**throw** mode — throws `ApiError` on non-2xx) **or** `__requestResult` (**result** mode
  — returns `Result<TData, TError>`).

`renderRuntime(..., errorMode)` emits **only** the chosen terminal (so `noUnusedLocals` stays clean);
`renderOperationsBlock(..., { errorMode })` emits matching call sites and the `<Op>Error` aliases.

## Consequences

- Operation signatures stay simple — no per-call conditional overloads; the mode is uniform across the
  client.
- Throw mode is byte-identical to the pre-extraction behavior; result mode reuses the same `__send`
  core, so retry/abort/auth/decoding logic lives in one place.
- Switching conventions requires regeneration (acceptable — it's a project-level choice, not a per-call
  one).
