---
name: swr-generator
description: Design of the ejected Redocly `swr` client generator. Read it, and update it, before changing generators/swr/.
---

# The `swr` generator — its skill

This file is the DESIGN of your ejected `swr` generator (`generators/swr/`):
**to change the generator, edit this skill first, then make the code match it** — a diff
to `generators/swr/` that has no covering sentence here is incomplete.

## What it emits

React SWR hooks over the sdk's exported operation functions: `use<Op>()` with a
`<op>Key()` key factory for queries, `useSWRMutation` for mutations.

## Design decisions that must hold

- **Wraps the sdk's functions** — it never re-implements requests, so it requires `typescript`
  and is throw-mode only.
- **Keys are exported factories** so consumers can invalidate precisely.
- **`envelope` is excluded** from hook options (`Omit<RequestOptions, "envelope">`) and
  stripped from the forwarded call: cached data is always the plain body.
- **Skips what it cannot wrap** — SSE operations and `<Op>Variables` name collisions —
  with a warning naming each one, never silently.

## The stage files

`render.ts` holds the whole hook renderer; `index.ts` is the entry. The wrappable-operation
policy and the sdk calling convention come from the typescript generator's published
contract (`@redocly/client-generator/contracts/typescript`), so this generator cannot
drift from the sdk it wraps.

## Ejecting it

`redocly eject-generator swr` copies this generator's TypeScript source folder to
`generators/swr/`, exactly as we wrote it, importing `@redocly/client-generator`,
`@redocly/client-generator/printers/typescript`, and
`@redocly/client-generator/contracts/typescript`. Running a `.ts` generator uses Node's
type stripping (Node 22.18, 23.6, or newer); newer built-in versions merge in per file
with `--update`. Change the hook shape or the key strategy, and regenerate.

## The modify loop

1. Edit this skill: state the new behavior or decision.
2. Make `generators/swr/` match it.
3. Run `redocly generate-client` and inspect the `git diff` of the generated output —
   generated files are never hand-edited.

Newer built-in versions merge in with `redocly eject-generator swr --update`.
