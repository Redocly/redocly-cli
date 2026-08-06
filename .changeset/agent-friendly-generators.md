---
'@redocly/client-generator': minor
'@redocly/cli': minor
---

Added agent-friendly client generation: `python`, `go`, `php`, and `cli` generators beside the TypeScript ones, a language-neutral authoring toolkit with per-generator options, and an `eject-generator` command that vendors any built-in generator — plus its design as an agent skill — into your repo.

**Note:** the per-operation pagination extension is now `x-redoclyPagination`; rename it in descriptions that used `x-redocly-pagination`, which is no longer read.
