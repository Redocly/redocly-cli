---
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Changed JSON Pointers in `respect` runtime expressions to accept every character that the Arazzo grammar allows, so put a space before `&&` that follows a pointer, as in `$response.body#/flag && $statusCode == 200`.
