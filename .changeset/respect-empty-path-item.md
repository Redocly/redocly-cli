---
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Fixed an issue where `respect` failed to find an operation by `operationId` when an empty path item or an empty operation came before it in the OpenAPI description.
