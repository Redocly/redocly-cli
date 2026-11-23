---
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Improved the Respect schema check's message for invalid OpenAPI response schemas.
The message names the source description, the schema location, and lists every schema that uses `nullable` without `type`.
