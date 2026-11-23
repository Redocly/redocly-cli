---
'@redocly/cli': minor
---

Changed the `bundle` command so that the `fileDependencies` field of the `--metafile` file lists the files of the bundle, where it was always an empty object.

**Note:** `fileDependencies` is now an array of paths relative to the current directory.
