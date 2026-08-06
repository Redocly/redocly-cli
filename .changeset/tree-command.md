---
'@redocly/openapi-core': minor
'@redocly/cli': minor
---

Added the experimental `tree` command: it prints an overview of an API description — its tags, webhooks, and component sections — and lets you drill into one tag, path, webhook, operation, or component with `--tag`, `--path`, `--webhook`, `--operation`, `--component`, and `--name`, with every result attributed to the file that defines it.
`--paths` and `--operations` list the whole API surface; `--used-by` runs impact analysis (which operations and components depend on a selection); `--with-deps` appends an operation's or component's raw source and its transitive `$ref` closure.
`--format=json` prints the same selection as machine-readable data — stable ids, JSON pointers, source files, line ranges, and summaries taken from the description itself; `--files` shows the file-level `$ref` graph.
The underlying engines live in `@redocly/openapi-core`'s new `api-graph` module (`analyzeApi`, `buildOverview`, `buildOperationCard`, `buildUsedByReport`).
