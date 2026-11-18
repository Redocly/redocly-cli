---
'@redocly/openapi-core': patch
'@redocly/cli': patch
---

Fixed an issue where the `no-invalid-schema-examples`, `no-invalid-media-type-examples`, and `no-invalid-parameter-examples` rules reported a valid decimal example.

The rules accept a value that differs from a multiple by less than one millionth of `multipleOf`, such as `1.0000001` for `multipleOf: 1`.
