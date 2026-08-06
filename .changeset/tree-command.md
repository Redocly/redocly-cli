---
'@redocly/openapi-core': minor
'@redocly/cli': minor
---

Added the experimental `tree` command: it prints an overview of an API description as a tree — its servers, tags, webhook names, and component sections — and lets you drill into one tag, path, webhook, operation, component, or file with `--tag`, `--path`, `--webhook`, `--operation`, `--component`/`--name`, and `--file`, with every result attributed to the file that defines it.
`--paths`, `--operations`, and `--webhooks` list the whole API surface, each entry already carrying its own typed one-hop `refs` and `usedBy`; `--used-by` runs impact analysis (which operations and components depend on a selection, including everything a whole file defines); `--with-deps` appends an operation's or component's raw source and its transitive `$ref` closure.
`--format=json` prints the same selection as machine-readable data — stable ids, JSON pointers, source files, line ranges, and summaries taken from the description itself; `--files` shows the file-level `$ref` graph, optionally filtered to one file's neighborhood with `--file`.
The underlying engines live in `@redocly/openapi-core`'s new `api-graph` module (`analyzeApi`, `buildOverview`, `buildOperationCard`, `buildUsedByReport`, `buildFileCard`).
