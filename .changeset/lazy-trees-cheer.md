---
'@redocly/openapi-core': patch
'@redocly/cli': patch
---

Updated js-yaml from `4.2.0` to `5.2.1`.
Fixed bundling of strings that look like numbers with underscores (e.g. `'12_34'`) so they stay quoted in the output.
**Note**: YAML parsing is now stricter: a multi-line flow collection whose closing bracket is not indented deeper than its parent key is now a parse error, and parse errors are reported at the offending token instead of the end of the document.
