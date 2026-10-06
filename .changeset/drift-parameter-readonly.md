---
'@redocly/cli': patch
---

Fixed the `schema-consistency` rule of the `drift` command so that a required `readOnly` property in a parameter schema is no longer reported as missing from the request.
