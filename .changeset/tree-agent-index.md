---
'@redocly/openapi-core': minor
'@redocly/cli': minor
---

Added the agent surface to the experimental `tree` command: `--format=json` now prints a hierarchical index of the API description (sections, tags, operations, and components with stable semantic ids, JSON pointers, source files, line ranges, and summaries taken from the description itself), `--node` returns one node — a branch as a sub-index, a leaf as its raw source lines with resolved `$ref`s — and `--with-deps` appends the node's transitive `$ref` closure.
The index, retrieval, and dependency-closure engines live in `@redocly/openapi-core`'s `api-graph` module (`analyzeApi`, `buildApiIndex`, `buildNodeEnvelope`, `appendDepsClosure`).
