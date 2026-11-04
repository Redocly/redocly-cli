---
'@redocly/client-generator': patch
'@redocly/cli': patch
---

Fixed an issue where the generated PHP client named a type twice in a discriminated union whose member is itself a union, which PHP rejects.
