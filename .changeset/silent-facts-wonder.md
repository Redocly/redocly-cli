---
"@redocly/cli": patch
---

Fixed the `split` command to properly handle root-level paths.
Previously, the root path `/` was converted to an empty string as a filename, leading to incorrect file structure and broken links.
Now, it correctly maps to the specified path separator.
