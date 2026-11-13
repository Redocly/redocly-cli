---
'@redocly/cli': patch
---

Changed the `score` command to count error responses only toward error clarity, so the schemas and examples of error responses no longer change the example, documentation, constraint, schema, and dependency metrics of an operation.
