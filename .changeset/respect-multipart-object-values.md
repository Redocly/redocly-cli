---
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Fixed an issue where `respect` sent `[object Object]` in a `multipart/form-data` request body when a runtime expression gave an object.
The object is now sent as `parent[child]` fields and a list as repeated fields, the same way as values written in the description.
