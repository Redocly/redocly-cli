---
"@redocly/openapi-core": patch
"@redocly/cli": patch
---

Fixed an issue where `--component-renaming-conflicts-severity` ignored conflicts when different files had components with the same name but different content.

**Warning:** Autogenrated component names and `$ref` paths in bundled documents may differ from older releases.
