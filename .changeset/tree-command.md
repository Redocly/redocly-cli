---
'@redocly/openapi-core': minor
'@redocly/cli': minor
---

Added the experimental `tree` command: it prints an overview of an API description as a tree — its servers, every tag and webhook down to their individual operations, and component sections — and lets you drill into one tag, path, webhook, operation, component, or file with `--tag`, `--path`, `--webhook`, `--operation`, `--component`/`--name`, and `--file`, with every result attributed to the file that defines it.
`--paths`, `--operations`, and `--webhooks` list the whole API surface, each entry already carrying its own typed one-hop `refs` and `usedBy`; `--used-by` runs impact analysis (which operations and components depend on a selection, including everything a whole file defines); `--with-deps` appends an operation's or component's transitive `$ref` closure. An operation or component selection renders as a tree too — coordinates, then `refs`/`usedBy`/`deps` as branches — with no raw source in the terminal output.
`--format=json` prints the same selection as machine-readable data — stable ids, JSON pointers, source files, line ranges, summaries, and (with `--with-deps`) raw source, all taken from the description itself; `--files` shows the file-level `$ref` graph, optionally filtered to one file's neighborhood with `--file`.
`--format=brief` is the agent format: it trims listing views (`--tag`, `--path`/`--webhook`, `--operations`, `--webhooks`, `--component`, and a `--file` card's `defines`) to one compact entry per item (method, path, summary, line range) and serializes every view without indentation; on a large listing the two effects together cut its size by over 90%.
The underlying engines live in `@redocly/openapi-core`'s new `api-graph` module (`analyzeApi`, `buildOverview`, `buildOperationCard`, `buildUsedByReport`, `buildFileCard`).
