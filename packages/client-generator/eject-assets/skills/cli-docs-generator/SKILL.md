---
name: cli-docs-generator
description: Design of the ejected Redocly `cli-docs` client generator. Read it, and update it, before changing generators/cli-docs.mjs.
---

# The `cli-docs` generator — its skill

This file is the DESIGN of your ejected `cli-docs` generator (`generators/cli-docs.mjs`):
**to change the generator, edit this skill first, then make the code match it** — a diff
to `generators/cli-docs.mjs` that has no covering sentence here is incomplete.

## What it emits

`<stem>.cli.md` — the Markdown reference for the generated CLI: the usage line, the
global flags, the credential environment variables, the exit-code table, and one section
per command with its positionals and flags (type, required, choices, description).

## Design decisions that must hold

- **One source of truth**: the page renders from `commandData(model, emit)` — the same
  table `runCli` dispatches on — and from `groupSlug`/`envPrefix`, the same functions the
  runtime addresses groups and reads credentials with. Documentation that derives from a
  second model drifts from the tool the first time either side changes, so it never does
  that. A new CLI capability shows up here only when it is in the command table.
- **Requires the `cli` generator** it documents: selecting `cli-docs` pulls in `cli` (and
  through it `typescript` and `zod`), so `--generator cli-docs` is a complete, consistent set.
- **The renderer IS the template.** Publishers who need another structure eject this
  generator rather than learning a template syntax — one customization mechanism, no
  template engine, no new dependency. Light customization stays in declared options.
- **Declared options**: `title` (page heading, default `<API title> CLI`) and
  `frontmatter` (emit YAML front matter with the title, default `false`). Both are
  validated by the pipeline before `run`, so the renderer reads them directly.
- **Markdown that survives a linter**: ATX headings, a blank line around every block, no
  hard tabs, and one sentence per line in prose — generated docs land in repos that lint
  Markdown in CI.
- **Escapes what descriptions contain**: a summary or description is arbitrary text, so
  pipes are escaped inside table cells and newlines collapse to spaces.

## Emitters that implement it

`emitters/cli-docs.ts` (the page renderer), over `emitters/cli.ts`'s `commandData` and
the runtime's `groupSlug`/`envPrefix`.

## Ejecting it

`redocly eject-generator cli-docs` ships this generator BUNDLED with the emitter it uses —
one small `.mjs` you own, importing `@redocly/client-generator` and
`@redocly/openapi-core`. Change the sections, the wording, or the table columns, and
regenerate: this is the answer to "can the documentation templates be ejected too".

## The modify loop

1. Edit this skill: state the new behavior or decision.
2. Make `generators/cli-docs.mjs` match it.
3. Run `redocly generate-client` and inspect the `git diff` of the generated output —
   generated files are never hand-edited.

Newer built-in versions merge in with `redocly eject-generator cli-docs --update`.
