---
name: go-generator
description: Design of the ejected Redocly `go` client generator. Read it, and update it, before changing generators/go/.
---

# The `go` generator — its skill

This file is the DESIGN of your ejected `go` generator (`generators/go/`):
**to change the generator, edit this skill first, then make the code match it** — a diff
to `generators/go/` that has no covering sentence here is incomplete.

## What it emits

One self-contained `<stem>.go` (`package client`): structs with `json` tags, a `Client`
with one `(T, error)` method per operation taking a `context.Context`, and the embedded
runtime. Go ≥ 1.21, standard library only — zero dependencies.

## Design decisions that must hold

- **Models are structs**: required fields by value, optionals as pointers with
  `,omitempty`; the `json` tag always carries the exact wire name.
- **Package clause:** `package client` by default, `goPackage` to override — a generated
  file usually lands in a package the consumer already owns. The value is checked against
  Go's own rule (lowercase letters, digits, `_`, no leading digit, not a keyword) and an
  invalid one fails generation: silently rewriting a publisher's package name would be
  worse than saying no.
- **Doc comments are gofmt's shape**, not the description's: a blank line prints as `//`
  (never `// `, which gofmt strips), and CONSECUTIVE blank lines collapse to one — gofmt
  rewrites `//\n//` to a single `//`, so emitting both means our output is not
  gofmt-clean. Descriptions with a double blank line are common in real specs.
- **Every parameter is its own argument, so their names share one namespace** with the
  arguments the method declares itself (`ctx`, `body`, `params`, and the receiver). Build them with
  `uniqueIdentifiers(..., { taken: … })`: OpenAPI lets one operation use a name in two
  locations (`id` in the path AND in the query), and Go rejects a duplicate parameter. The
  wire name is untouched, so the request is unchanged.
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
- **The EMITTED FILE is gofmt-clean, not just the runtime.** `gofmt -l` on generated
  output must print nothing, so the download is idiomatic as-is. The emitter earns that
  deterministically, without shelling out to `gofmt`:
  - `alignGoColumns` pads columns the way gofmt's tabwriter does — struct field types and
    tags, `const`/`var` types and `=`, and map-literal values — within each contiguous run.
    A line starting with a Go KEYWORD is a statement, never a declaration, and must never
    be padded (`case "x":` is not a field).
  - `case` sits at its `switch`'s own indent, so the switch body is not emitted as an
    indented block.
  - At most one blank line between declarations, none at end of file, and a blank line
    inside a doc comment is `//` — never `// ` with a trailing space.
    A change here is verified by the `gofmt -l` bar in the unit suite, at cafe AND
    large-description scale.
- The runtime is hand-written in `runtime/runtime.go` in this folder (gofmt-clean, `go vet`-clean)
  and embedded at prepare time.
  Under `--runtime module` it is written as a same-package `runtime.go` beside the client,
  whose import block then lists only the packages its own body uses.
- Authored ONLY with the neutral toolkit — the dogfooding guard fails otherwise.

- **It documents itself.** With `client.docs` (or `--docs`), the `docs` hook writes
  `<stem>.go.md`: the security schemes, then one section per operation with its parameters,
  body, response type, and behavior notes. The call snippets come from this generator's own
  `sample` hook, so the page can only show the syntax of the SDK beside it, and the layout
  comes from `renderReferencePage` in the authoring toolkit — reachable from an ejected copy
  through `@redocly/client-generator`. Pagination on the page is decided by
  `paginationRuleFor`, the same helper this generator resolves pagination with.

## The modify loop

1. Edit this skill: state the new behavior or decision.
2. Make `generators/go/` match it.
3. Run `redocly generate-client` and inspect the `git diff` of the generated output —
   generated files are never hand-edited.

Newer built-in versions merge in with `redocly eject-generator go --update`.
