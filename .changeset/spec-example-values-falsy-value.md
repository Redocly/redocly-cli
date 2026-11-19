---
'@redocly/openapi-core': patch
'@redocly/cli': patch
---

Fixed an issue where an example with `externalValue` and a `value` of `0`, `false`, `null`, or an empty string was not reported.
