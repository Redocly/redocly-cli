---
'@redocly/openapi-core': minor
'@redocly/cli': minor
---

Added the experimental `tree` command: it prints the structure of an API description — paths, operations, and the `$ref` dependency chains between them — with every node attributed to the file that defines it, and runs impact analysis with `--uses` (which paths and operations use a given component or file).
For LLM agents and tooling, `--format=json` prints a hierarchical index with stable semantic ids, JSON pointers, source files, line ranges, and summaries taken from the description itself; `--node` returns one node (a branch as a sub-index, a leaf as its raw source lines with resolved `$ref`s), and `--with-deps` appends the node's transitive `$ref` closure.
The underlying engines live in `@redocly/openapi-core`'s new `api-graph` module (`analyzeApi`, `buildApiIndex`, `buildNodeEnvelope`, `appendDepsClosure`).
