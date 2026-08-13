---
'@redocly/client-generator': minor
'@redocly/cli': minor
---

Added agent-friendly client generation: `python`, `go`, `php`, `cli`, and `cli-docs` generators beside the TypeScript ones, composable generated CLIs (custom commands, one binary over several APIs via `client.cliOutput`), a language-neutral authoring toolkit with per-generator options, and an `eject-generator` command that vendors any built-in generator — plus its design as an agent skill — into your repo.

**Note**: the pagination operation extension was renamed from `x-redocly-pagination` to `x-redoclyPagination`; the old name is no longer read.

**Note**: the TypeScript client generator is now selected as `typescript` instead of `sdk`, matching the language-named generators. Update `client.generators` lists and `--generator` flags; the old name fails with a message that points at the rename.
