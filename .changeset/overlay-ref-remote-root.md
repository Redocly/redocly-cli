---
'@redocly/openapi-core': patch
'@redocly/cli': patch
---

Fixed an issue where the `bundle` command didn't resolve a `$ref` in an overlay that pointed to a local file when the API description was a URL.
The command tried to download the file from the server that hosts the API description instead of reading it from disk.
