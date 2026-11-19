---
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Fixed an issue where Respect did not evaluate a runtime expression with a name that starts with a digit, an underscore, or a hyphen, such as `$inputs._token`, or an `$inputs` expression with a JSON Pointer, such as `$inputs.customer#/name`.
