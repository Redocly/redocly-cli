---
'@redocly/openapi-core': patch
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Fixed the Arazzo `parameters-unique` rule to check a `reference` or `$ref` as the parameter it points to, and to compare parameters by both `name` and `in`.
Previously, two references to parameters with the same name weren't reported, while parameters with the same name in different locations, such as `path` and `query`, were.
`respect` also fails a step that passes two parameters with the same name to a workflow, instead of using the last value.
**Note:** descriptions with such duplicates now fail `lint`, and `respect` doesn't run them.
