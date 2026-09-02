---
'@redocly/cli': patch
'@redocly/respect-core': patch
---

Fixed `generate-arazzo` mangling a remote description URL in `sourceDescriptions` (`https://` collapsed to `https:/`) when `--output-file` was provided.
