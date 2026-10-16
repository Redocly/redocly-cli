---
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Fixed an issue where the `respect` command altered string values in runtime expressions that contained a dot followed by a digit.
For example, a token read through `$response.body#/token` or a quoted value in success criteria.
