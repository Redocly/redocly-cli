---
'@redocly/cli': patch
---

Fixed a path traversal in the `split` command that might have written files outside the chosen `--outDir`.
