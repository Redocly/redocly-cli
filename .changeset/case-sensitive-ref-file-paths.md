---
'@redocly/openapi-core': minor
'@redocly/cli': minor
---

Changed file paths to be case-sensitive on every operating system.
A path whose letter case differs from the file or folder name on disk worked on macOS and Windows, and failed on Linux.
Now it fails everywhere, and the error message shows the name to use.
This applies to the paths passed to a command, including globs, the paths in `redocly.yaml`, such as `apis`, `extends`, and `plugins`, and the paths in a `$ref`.
Redocly CLI finds the `redocly.yaml` and `.redocly.lint-ignore.yaml` files only when their names are in that exact letter case.

**Note:** a command that passed on macOS or Windows with a path in the wrong letter case now fails there.
To fix it, write the path with the same letter case as on disk.
