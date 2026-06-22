---
'@redocly/openapi-core': patch
---

Fixed bundling of strings that look like numbers with underscores (e.g. `'12_34'`). Since js-yaml `4.2.0` such strings were emitted unquoted and could be read back as numbers by YAML 1.1 parsers; they are now kept quoted in the output.
