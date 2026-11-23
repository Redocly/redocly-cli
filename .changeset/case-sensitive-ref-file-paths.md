---
'@redocly/openapi-core': minor
'@redocly/cli': minor
---

Changed the resolution of a `$ref` to a local file to be case-sensitive on every operating system.
A `$ref` whose letter case differs from the file or folder name on disk resolved on macOS and Windows, and failed on Linux.
Now it fails everywhere, and the error message shows the name to use.

**Note:** an API description with such a `$ref` that passed `lint`, `bundle`, and other commands on macOS or Windows now fails there.
To fix it, write the path in the `$ref` with the same letter case as on disk.
