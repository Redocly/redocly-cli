---
'@redocly/openapi-core': patch
'@redocly/cli': patch
---

Added the rule name to the error that a configurable rule reports when an assertion is used with or without the `property` key by mistake.
The error is now reported when the rule is loaded, even if the API description has no node of the rule's subject type.
