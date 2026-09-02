---
'@redocly/cli': patch
'@redocly/respect-core': patch
---

Fixed an issue where `generate-arazzo` produced a malformed remote description URL in `sourceDescriptions` (`https://` collapsed to `https:/`) when `--output-file` was provided.
