# The `sdk-docs` generator — its skill

This file is the generator's DESIGN and governs our own changes: **to change the
generator, edit this skill first, then make the code match it.**

## What it emits

One Markdown page for each SDK generator selected in the same run: `<stem>.python.md`,
`<stem>.go.md`, `<stem>.php.md`, `<stem>.typescript.md`. A page carries the heading, the
requirements of that language, the security schemes the description declares, and one
section per operation: method and path, a call sample in that language, the parameters,
the request body, the response type, and the behavior notes (paginated, SSE, binary).

## Design decisions that must hold

- **No hand-written call syntax.** Every code block on the page comes from the SDK
  generator's own `sample` hook — the same hook that produces `codeSamples`. This
  generator never writes Python, Go, PHP, or TypeScript itself. A page that spelled out
  call syntax would state the SDK a second time and would lie the first time the SDK
  changed.
- **The hooks arrive as data.** The pipeline passes `samples` (the `sample` hook of every
  selected generator, keyed by generator name) in `GeneratorInput`. Importing the language
  generators instead would pull all four of them into this module and into the file
  `eject-generator` produces.
- **It documents what is selected, and nothing else.** The pages come from
  `selected ∩ {typescript, python, go, php}`. `requires` cannot express "one of these
  four", so a selection with no SDK fails in `run` with the fix in the message. It never
  pulls an SDK in: adding a language to someone's output because they asked for docs would
  be a surprise, and it would emit a megabyte of SDK.
- **No fact is re-derived here.** The page does not name the SDK file, because each
  language decides that name (`my-api.ts` becomes `my_api.py`). Parameters, bodies,
  responses, and pagination come from the IR, which is what the SDKs are built from too.
  What this generator knows by itself is one line per language: the label, the fence
  language, and the runtime requirement.
- **Declared options**: `title` (page heading, default `<API title> <Language> SDK
reference`) and `frontmatter` (YAML front matter carrying the title, default `false`).
  With more than one SDK selected, a caller-supplied `title` gets the language appended,
  because two pages must not share one heading.
- **The renderer IS the template.** Publishers who need another structure eject this
  generator. No template syntax, no new dependency.
- **Markdown that survives a linter**: ATX headings, a blank line around every block, no
  hard tabs, and one sentence per line in prose.
- **Escapes what descriptions contain**: a summary or description is arbitrary text, so
  pipes are escaped inside table cells and newlines collapse to spaces.

## Emitters that implement it

`emitters/sdk-docs.ts` (the page renderer), over the IR and the `sample` hooks the
pipeline supplies.

## Ejecting it

`redocly eject-generator sdk-docs` ships this generator BUNDLED with its renderer — one
small `.mjs` you own, importing `@redocly/client-generator` and `@redocly/openapi-core`.
The language generators are not bundled with it, because the samples arrive as data.

## The modify loop

1. Edit this skill: state the new behavior or decision.
2. Change `emitters/sdk-docs.ts` (the entry is plumbing — it rarely moves).
3. Verify: `npm run compile`, the emitter unit suites
   (`VITEST_SUITE=unit npx vitest run packages/client-generator/src/emitters`), and
   `tests/e2e/generate-client/sdk-docs.test.ts`.
