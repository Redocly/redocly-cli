---
'@redocly/openapi-core': patch
'@redocly/cli': patch
---

Upgraded `js-yaml` from v4 to v5. This fixes bundling of strings that look like numbers with underscores (e.g. `'12_34'`): they are now kept quoted in YAML output instead of being emitted unquoted and read back as numbers by YAML 1.1 parsers.

**Breaking change:** js-yaml v5 parses YAML more strictly. A multi-line flow collection whose closing bracket is indented to (or below) the level of its parent key is now a parse error. For example, this no longer parses and must be reindented:

```yaml
example: { 'a': 'test' } # <- move the closing brace to the right of `example:`
```

All other scalar resolution (hex/octal/leading-zero integers, capitalized booleans, `~` as null, dates kept as strings) and the handling of empty/comment-only documents are unchanged.
