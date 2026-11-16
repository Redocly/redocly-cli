---
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Improved the message that the Respect schema check prints when a response schema in the OpenAPI description is not valid.
The message now names the source description and the location of the schema, and lists every schema that uses `nullable` without `type`.
