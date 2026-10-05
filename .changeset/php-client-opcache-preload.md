---
'@redocly/client-generator': patch
'@redocly/cli': patch
---

Fixed an issue where the generated PHP client failed with `Undefined constant "OPERATIONS"` when OPcache preload was enabled.
