---
'@redocly/cli': patch
'@redocly/openapi-core': patch
---

Fixed an issue where a `$ref` to a local file resolved on macOS and Windows when its letter case didn't match the file or folder name on disk, but failed on Linux.
Such a `$ref` now fails to resolve on every operating system, and the error message shows the name to use.

**Note:** API descriptions with such a `$ref` that passed `lint` or `bundle` on macOS or Windows now fail there too.
