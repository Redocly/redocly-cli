---
'@redocly/openapi-core': patch
'@redocly/cli': patch
---

Made linting faster on large API descriptions:

- The line and column of a problem come from a cached index of line offsets instead of a rescan of the whole file for every problem.
- The `no-invalid-media-type-examples`, `no-invalid-parameter-examples`, and `no-invalid-schema-examples` rules compile one validator per distinct schema instead of one per example location.
