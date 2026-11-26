---
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Fixed an issue where Respect didn't evaluate runtime expressions with characters that the Arazzo specification allows in JSON Pointers or query and path parameter names.
