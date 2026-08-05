# The `go` generator — its skill

This file is the generator's DESIGN. It ships to users on `redocly eject-generator go`
(as `generators/go.AGENTS.md`) and governs our own changes: **to change the generator,
edit this skill first, then make the code match it** — a diff to `index.ts` that has no
covering sentence here is incomplete.

## What it emits

One self-contained `<stem>.go` (`package client`): structs with `json` tags, a `Client`
with one `(T, error)` method per operation taking a `context.Context`, and the embedded
runtime. Go ≥ 1.21, standard library only — zero dependencies.

## Design decisions that must hold

- **Models are structs**: required fields by value, optionals as pointers with
  `,omitempty`; the `json` tag always carries the exact wire name.
- **Naming:** exported PascalCase via `identifierFor` + an `N` prefix for digit-leading
  names (`3ds` → `N3ds` — an `_`-prefixed field is unexported and invisible to
  `encoding/json`); `+1`/`-1` become `Plus1`/`Minus1`.
- **Enums** are typed consts (`type Status string` + `StatusInProgress Status = …`);
  **discriminated unions** are `type X = any` plus a generated `UnmarshalX([]byte)`
  dispatcher; **allOf** is flattened.
- **Errors:** `(T, error)` returns ARE the error mode — `errorMode` does not change the
  output (the generator declares `errorModes: ['throw']`, so `result` fails fast).
  Non-2xx → `*APIError`; timeouts → `*TimeoutError`.
- **Dates:** `dateType: Date` maps `format: date-time` to `time.Time` (encoding/json
  handles RFC 3339 natively) and `date` to the runtime's `Date` wrapper, which
  marshals as `2006-01-02`. Query values format explicitly, never via `String()`.
- **Response headers:** an operation that DECLARES success-response headers gains a
  `<Op>WithHeaders(ctx, …) (T, <Op>Headers, error)` variant; `<Op>Headers` is a
  generated struct with pointer fields (nil when absent or unparsable), coerced to
  int64/bool/string. Operations without declared headers get no variant, and the
  base method stays `(T, error)`.
- **Servers:** when the description declares servers, one `<Name>URL(...)` function per
  server is emitted (named from the server description); server VARIABLES become string
  parameters (Go has no defaults — the doc comment states the spec default), so templated
  base URLs need no manual string building. The client's baked default stays `servers[0]`
  with variable defaults substituted.
- **Parity surface:** auth, retries with `Retry-After` + jittered backoff, per-attempt
  `context.WithTimeout`, idempotency keys, middleware, pagination (`<Op>Pages`/`<Op>Items`
  as `func(yield func(T, error) bool)` — `range`-over-func needs Go ≥ 1.23; 1.21 calls
  them with a callback), SSE, multipart.
- The runtime is hand-written in `go-runtime/runtime.go` (gofmt-clean, `go vet`-clean)
  and embedded at prepare time.
- Authored ONLY with the neutral toolkit — the dogfooding guard fails otherwise.

## The modify loop

1. Edit this skill: state the new behavior or decision.
2. Change `index.ts` (and `go-runtime/runtime.go` for runtime behavior; `gofmt -w` +
   `go vet ./...` it, then `npm run prepare -w @redocly/client-generator`).
3. Verify: `npm run compile`, then
   `VITEST_SUITE=unit npx vitest run packages/client-generator/src/generators/__tests__/go.test.ts`
   (real `go build` + `go vet` bars), the e2e smoke (`tests/e2e/generate-client/go.test.ts`),
   and the large-description bars (`tests/e2e/generate-client/large-descriptions.test.ts`).
