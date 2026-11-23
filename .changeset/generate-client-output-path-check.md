---
'@redocly/cli': patch
---

Fixed an issue where the `generate-client` command wrote the client of the first API and then failed when the clients of two APIs had the same output path.
