---
'@redocly/openapi-core': patch
'@redocly/cli': patch
---

Speed up ref resolution by reading the `$anchor` key of an API description node directly instead of scanning every key of that node.
