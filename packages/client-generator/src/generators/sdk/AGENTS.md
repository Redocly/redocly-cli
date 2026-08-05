# The `sdk` generator — its skill

This file is the generator's DESIGN and governs our own changes: **to change the
generator, edit this skill first, then make the code match it** — a diff with no
covering sentence here is incomplete.

## What it emits

The typed TypeScript client itself: model types with JSDoc, type guards, the `Ops`
type map, the `OPERATIONS` descriptor table, a `client` instance, flat call sugar,
and either the embedded runtime (`runtime: inline`) or imports from
`@redocly/client-generator` (`runtime: package`).

## Design decisions that must hold

- **Descriptor-driven:** generated code is DATA (`OPERATIONS` + `Ops`) plus wiring;
  request behavior lives in the runtime, never in per-operation code.
  `satisfies Record<string, OperationDescriptor>` is the version-skew guard.
- **`single` vs `split`:** split derives `<stem>.schemas.ts` (types, enums, guards) and
  an entry that `export *`s it; the entry type-imports only the schema names it
  references (`collectEntrySchemaRefs`).
- **Zero runtime dependencies.** `Date`, `Blob`, `fetch` — nothing else.
- **Names are collision-safe:** `packageIdents` seeds every reserved wiring name before
  any operation is sanitized, so renames are deterministic (`configure` → `configure_2`).
  A rename becomes part of the SDK's public API, so the warning must say WHICH cause it
  is and what the publisher can do: a duplicate `operationId` in the description (fix the
  description — the only real fix), a name that isn't a valid identifier, or a clash with
  a name the generated module already declares. A vague "collides or is invalid" message
  leaves the publisher unable to act.
- **Throw mode returns the body**; `{ envelope: true }` opts into
  `{ data, headers, response }` with typed declared headers. Result mode returns
  `{ data, error, response }` and ignores `envelope`.

## Emitters that implement it

`emitters/client-assembly.ts` (orchestration), `render-client.ts` (Ops, aliases, flat
sugar), `descriptor.ts`, `ts-type.ts`/`ts-literal.ts` (type + data text), `sse.ts`,
`pagination.ts`, `response-headers.ts`, `inline-runtime.ts`, `setup-bake.ts`.

## Not ejectable — and the customization path

`redocly eject-generator` covers the standalone language SDKs (`python`, `go`, `php`),
whose entire generator is one self-contained file. This generator is a thin entry over
the SHARED TypeScript emitters listed above, so handing you a copy of the entry would
hand you nothing to customize. Customize the OUTPUT instead:

- `client.setup` bakes publisher defaults into the generated client.
- Middleware and `configure()` change behavior at runtime, not at generate time.
- A custom generator (`defineGenerator`) emits your own artifact beside the client.

Ask for a helper or a knob you're missing rather than working around it — that request
is the roadmap signal.

## The modify loop

1. Edit this skill: state the new behavior or decision.
2. Change the emitter modules named above (the entry is plumbing — it rarely moves).
3. Verify: `npm run compile`, the emitter unit suites
   (`VITEST_SUITE=unit npx vitest run packages/client-generator/src/emitters`), the e2e
   suites for this generator, and the large-description bars
   (`tests/e2e/generate-client/large-descriptions.test.ts`).
