---
'@redocly/cli': minor
---

Fixed an issue where the `fileDependencies` field of the `bundle` command's `--metafile` file was always empty.
`fileDependencies` lists the bundled files, relative to the current directory.
