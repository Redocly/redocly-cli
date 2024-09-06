---
"@redocly/cli": patch
---

Fixed a bug where bundling multiple API description files specified as CLI arguments, along with the `--output` option, stored the result in a single file instead of a folder.
