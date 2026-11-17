---
'@redocly/openapi-core': patch
'@redocly/cli': patch
---

Improved the error messages for misconfigured configurable rules.
The error names the rule and is reported even if the API description has no node of the rule's subject type.
