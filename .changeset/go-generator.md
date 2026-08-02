---
'@redocly/client-generator': minor
'@redocly/cli': minor
---

Added a built-in `go` generator — a self-contained, zero-dependency Go SDK over the standard library with typed structs, enums, discriminated-union dispatchers, a context-aware client with `(T, error)` methods, auth, retries, timeouts, idempotency keys, middleware, pagination iterators (`<Op>Pages` / `<Op>Items` in `range`-over-func style), SSE streaming, and multipart bodies, plus Go `x-codeSamples`. Also added two language-neutral authoring helpers, `schemaAtPointer` and `paginationRuleFor`, shared by every generator.
