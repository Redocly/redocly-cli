---
'@redocly/cli': patch
---

Fixed the `preview` command previewing the whole workspace package instead of the directory it was run from, when launched with `npx` from a subdirectory of an npm workspace.
