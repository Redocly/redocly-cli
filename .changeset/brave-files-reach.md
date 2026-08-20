---
'@redocly/cli': patch
---

Fixed `tree --with-deps --format=ai` returning an empty dependency closure for a multi-file description that does not lay its files out as `components/<section>/<name>`: those dependencies now appear with their signatures instead of falling into `deeper:`, and a dependency that is a whole file is named once rather than twice.
