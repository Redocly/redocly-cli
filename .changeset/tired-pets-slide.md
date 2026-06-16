---
'@redocly/cli': patch
---

Fixed a path traversal in the `split` command that could write files outside the chosen `--outDir`.
