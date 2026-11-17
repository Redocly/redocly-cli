---
'@redocly/openapi-core': patch
'@redocly/cli': patch
---

Fixed an issue where `lint` stopped with an error instead of reporting the problems when the `sourceDescriptions`, `workflows`, `steps`, or `dependsOn` of an Arazzo description was not a list or had an empty item.
