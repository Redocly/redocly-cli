---
'@redocly/client-generator': minor
'@redocly/cli': minor
---

Added agent-friendly client generation: `python`, `go`, `php`, `cli`, and `cli-docs` generators in addition to TypeScript generators.

Added composable generated CLIs (custom commands, one binary over several APIs via `client.cliOutput`).

Added language-neutral authoring toolkit with per-generator options.

Added  an `eject-generator` command that vendors any built-in generator, with its design as an agent skill, into your repo.

Renamed pagination operation extension from `x-redocly-pagination` to `x-redoclyPagination`.
The previous name is no longer read.

**Note**: the TypeScript client generator is now selected as `typescript` instead of `sdk`, matching the language-named generators. Update `client.generators` lists and `--generator` flags; the old name fails with a message that points at the rename.
