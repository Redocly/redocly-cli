---
'@redocly/openapi-core': patch
'@redocly/cli': patch
---

Updated js-yaml from `4.2.0` to `5.2.1`.
Fixed an issue where strings that look like numbers with underscores (for example `'12_34'`) had quotation marks removed by the `bundle` command.
These strings stay quoted in the output.

**Note**: YAML parsing is stricter: a multi-line flow collection whose closing bracket is not indented deeper than its parent key is now a parse error.
Parse errors are reported at the offending token instead of the end of the document.
