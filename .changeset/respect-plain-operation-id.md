---
'@redocly/cli': patch
'@redocly/respect-core': patch
---

Fixed an issue where `respect` failed with an unexpected error when a step used an `operationId` without the `$sourceDescriptions.<name>.` prefix and the Arazzo file also listed an `arazzo` source description.
Such `operationId`s are looked up in the `openapi` source descriptions only.
