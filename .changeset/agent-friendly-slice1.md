---
'@redocly/client-generator': minor
'@redocly/cli': minor
---

Added the language-neutral generator-authoring toolkit (`flattenAllOf`, `discriminatorCases`, nullability and enum helpers, casing/identifier utilities, and `CodeWriter`), available from the package root so custom generators in any output language never load TypeScript; the generation pipeline now loads built-in generators lazily. Generators can implement a `sample()` hook, and `client.codeSamples: true` emits an OpenAPI Overlay adding per-operation `x-codeSamples` (the TypeScript sdk ships the reference implementation).
