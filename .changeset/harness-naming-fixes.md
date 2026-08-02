---
'@redocly/client-generator': patch
'@redocly/cli': patch
---

Fixed three naming bugs found by generating clients from real-world API descriptions: strict-mode reserved words (such as `package`) are now sanitized in generated TypeScript, `+1`/`-1` property names become distinct `Plus1`/`Minus1` identifiers instead of colliding (the Python client silently dropped one of the fields), and digit-leading property names (such as `3ds`) produce exported Go struct fields instead of unexported ones that `encoding/json` ignores.
