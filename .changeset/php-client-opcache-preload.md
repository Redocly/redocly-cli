---
'@redocly/client-generator': patch
'@redocly/cli': patch
---

Fixed the generated PHP client failing with `Undefined constant "OPERATIONS"` when OPcache preload is enabled.
