---
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Fixed an issue where `respect` ignored parameters defined on a path item when a step used `operationId` and took its request data from the API description.
