---
'@redocly/openapi-core': patch
'@redocly/cli': patch
---

Fixed an issue where a `$ref` in an overlay that points to a local file failed to resolve when the API description is a URL.
The `bundle` command requested the file from the API description's origin instead of reading it from disk.
