---
'@redocly/client-generator': minor
'@redocly/cli': minor
---

Every generator — including the TypeScript `sdk` and its satellites — is now authored with source-text templates instead of the TypeScript compiler AST, with byte-identical generated output. Generating a client no longer loads the `typescript` package for any selection (`--setup` baking remains the one lazy exception), and the `@redocly/client-generator/generate` toolkit now exports the text renderers the sdk itself uses (`tsType`, `tsJsdoc`, `codeLiteral`).

**Note:** the AST exports (`ts`, `printStatements`, `parseStatements`, `printNodes`, `arrow`, `constArray`, `exportConstStatement`, `jsdoc`, `schemaToTypeNode`) were removed from `@redocly/client-generator/generate`, and `schemaToZodExpression` now returns source text instead of a `ts.Expression`. Custom generators built on the AST API should switch to the text toolkit — see the updated `ast-toolkit-generator` example.
