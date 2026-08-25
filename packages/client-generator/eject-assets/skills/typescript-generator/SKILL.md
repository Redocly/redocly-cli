---
name: typescript-generator
description: Design of the ejected Redocly `typescript` client generator. Read it, and update it, before changing generators/typescript/.
---

# The `typescript` generator — its skill

This file is the DESIGN of your ejected `typescript` generator (`generators/typescript/`):
**to change the generator, edit this skill first, then make the code match it** — a diff
to `generators/typescript/` that has no covering sentence here is incomplete.

## What it emits

The typed TypeScript client itself: model types with JSDoc, type guards, the `Ops`
type map, the `OPERATIONS` descriptor table, a `client` instance, one binding per
operation, and the runtime — embedded in the file (`runtime: inline`, the default) or
written as real modules in a `runtime/` folder beside it that the client imports
relatively (`runtime: module`).

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
- **One operation, one function, one input shape.** The module-level names are bindings
  of the client's own methods (`export const { getOrder } = client;`), never wrappers, so
  `getOrder` and `client.getOrder` cannot disagree about their arguments. `argsStyle`
  shapes the method itself: `grouped` (the default) namespaces the inputs by transport
  layer — `path`, `query`, `headers`, `cookies`, `body` — and `flat` merges them into one
  object, which the runtime converts back using the descriptor's own parameter list. An
  operation whose merged names would collide keeps the grouped shape.
- **Throw mode returns the body**; `{ envelope: true }` opts into
  `{ data, headers, response }` with typed declared headers. Result mode returns
  `{ data, error, response }` and ignores `envelope`.

## The stage files

One file per stage of the emit, same skeleton as the other generators:
`types.ts` renders type text (`tsType`, JSDoc, the model type aliases);
`operations.ts` the per-operation surface (the `Ops` map, the `<Op>*` aliases, the
input shapes, `flatInputShape`);
`descriptor.ts` the `OPERATIONS` wire table and the collision-safe `packageIdents`;
`client.ts` the assembly (single/split entries, the runtime needs, the module-mode
runtime files);
`type-guards.ts`, `response-headers.ts`, `operation-types.ts`, `operation-signature.ts`
the narrower questions their names state;
`banner.ts` the generated-by header and title comment;
`inline-runtime.ts` the runtime assembly for both modes. The runtime's real sources ship
inside the package and reach the generator through
`@redocly/client-generator/runtime-sources` (in this repo they live in `runtime/` beside
these files). Naming and string escaping live in the TypeScript printer
(`@redocly/client-generator/printers/typescript`).

## Ejecting it

`redocly eject-generator typescript` copies this generator's TypeScript source folder to
`generators/typescript/` — the stage files above, exactly as we wrote them. Imports stay
package specifiers: `@redocly/client-generator` (the toolkit and IR types),
`@redocly/client-generator/printers/typescript` (naming and text mechanics), and
`@redocly/client-generator/runtime-sources` (the runtime sources it embeds). Running a
`.ts` generator uses Node's own type stripping (Node 22.18, 23.6, or newer), and newer
built-in versions merge into your copy per file with
`redocly eject-generator typescript --update`.

It is the largest of them, so reach for the smaller paths first when they fit:
`client.setup` bakes publisher defaults into the generated client, and middleware or
`configure()` change behavior at run time rather than generation time.

- **It documents itself.** With `client.docs` (or `--docs`), the `docs` hook writes
  `<stem>.typescript.md`: the security schemes, then one section per operation with its parameters,
  body, response type, and behavior notes. The call snippets come from this generator's own
  `sample` hook, so the page can only show the syntax of the SDK beside it, and the layout
  comes from `renderReferencePage` in the authoring toolkit — reachable from an ejected copy
  through `@redocly/client-generator`. Pagination on the page is decided by
  `paginationRuleFor`, the same helper this generator resolves pagination with.

## The modify loop

1. Edit this skill: state the new behavior or decision.
2. Make `generators/typescript/` match it.
3. Run `redocly generate-client` and inspect the `git diff` of the generated output —
   generated files are never hand-edited.

Newer built-in versions merge in with `redocly eject-generator typescript --update`.
