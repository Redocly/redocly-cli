---
'@redocly/openapi-core': patch
'@redocly/cli': patch
---

Fixed an issue where the `bundle` command dropped sibling keywords of a root-level `$ref` when the referenced schema itself started with a `$ref` (for example, an external schema file composing another file).
Such schemas are now preserved as separate components with their sibling keywords intact, and the `lint` command validates the sibling keywords instead of silently skipping them.
