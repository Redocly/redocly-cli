---
'@redocly/cli': patch
---

Fixed the `generate-client` command so that it writes no client when two APIs resolve to the same output path. Before, it wrote the client of the first API and then failed.
