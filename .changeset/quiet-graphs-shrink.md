---
'@redocly/cli': minor
---

`tree --files --format=ai` now reports the file graph as a flat list with each file's outgoing ref count, collapsing to per-directory counts past 40 files, instead of dumping the whole graph as compact JSON. On a description split across 2,909 files that output was 1.6 MB in a single line — larger than the rest of the description — and is now under a kilobyte; `--format=json` still returns the full graph.
