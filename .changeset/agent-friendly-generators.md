---
'@redocly/client-generator': minor
'@redocly/cli': minor
---

Added agent-friendly client generation: built-in `python`, `go`, `php`, and `cli` generators, a language-neutral authoring toolkit with a per-generator `AGENTS.md` skill, `eject-generator` and `architect-generator` commands, `x-codeSamples` output, and a real-world verification harness — with every generator now emitting through source-text templates.

**Note:** the AST exports (`ts`, `printStatements`, `schemaToTypeNode`, …) were removed from `@redocly/client-generator/generate` in favor of the text toolkit (`tsType`, `tsJsdoc`, `codeLiteral`).
