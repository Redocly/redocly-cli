---
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Fixed an issue where `respect` did not evaluate a runtime expression embedded in a string value inside other braces, such as `'{"search":"{$inputs.search}"}'`.
