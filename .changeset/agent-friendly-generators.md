---
'@redocly/client-generator': minor
'@redocly/cli': minor
---

Added agent-friendly client generation: `python`, `go`, `php`, `cli`, and `cli-docs` generators beside the TypeScript ones, composable generated CLIs (custom commands, one binary over several APIs via `client.cliOutput`), a language-neutral authoring toolkit with per-generator options, and an `eject-generator` command that vendors any built-in generator — plus its design as an agent skill — into your repo.

**Note**: the pagination operation extension was renamed from `x-redocly-pagination` to `x-redoclyPagination`.
The old name still works and prints a rename warning.

**Note:** the per-operation pagination extension is now `x-redoclyPagination`; rename it in descriptions that used `x-redocly-pagination`, which is no longer read.
