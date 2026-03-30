---
"@redocly/openapi-core": patch
"@redocly/cli": patch
---

Fixed multiple issues in the `spec-discriminator-defaultMapping` rule that could cause crashes or incorrect validation results.
The rule now correctly resolves existing schema names, traverses composite schemas (`allOf`, `anyOf`, `oneOf`) to find required properties, treats `defaultMapping` values as `$ref`s to schemas, resolves `$ref`s correctly across files, and handles cyclic schema dependencies.
