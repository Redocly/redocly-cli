---
name: typescript-generator
description: Design of the ejected Redocly `typescript` client generator. Read it, and update it, before changing generators/typescript.mjs.
---

# The `typescript` generator — its skill

This file is the DESIGN of your ejected `typescript` generator (`generators/typescript.mjs`):
**to change the generator, edit this skill first, then make the code match it** — a diff
to `generators/typescript.mjs` that has no covering sentence here is incomplete.

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

## Ejecting it

`redocly eject-generator typescript` ships this generator BUNDLED with the emitters it uses —
one `.mjs` you own, unminified, with a comment marking each source module. It imports
only `@redocly/client-generator` (the toolkit and the embedded runtime) and
`@redocly/openapi-core` (`logger`, `isPlainObject`), so runtime fixes still arrive by
`npm update`.

It is the largest of them (the whole client emitter plus the runtime it embeds), so reach
for the smaller paths first when they fit: `client.setup` bakes publisher defaults into the
generated client, and middleware or `configure()` change behavior at run time rather than
generation time.

## The modify loop

1. Edit this skill: state the new behavior or decision.
2. Make `generators/typescript.mjs` match it.
3. Run `redocly generate-client` and inspect the `git diff` of the generated output —
   generated files are never hand-edited.

Newer built-in versions merge in with `redocly eject-generator typescript --update`.
