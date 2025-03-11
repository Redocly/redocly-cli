---
"@redocly/respect-core": patch
"@redocly/cli": patch
---

Fixed `generate-arazzo` command to properly handle directory paths when creating output files. Now correctly creates the output file in the specified directory and automatically appends the default filename when a directory path is provided.
