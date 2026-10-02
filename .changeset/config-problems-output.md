---
'@redocly/cli': patch
'@redocly/openapi-core': patch
---

Configuration file problems are now printed to `stderr` in the `codeframe` format for every command, regardless of the `--format` option.
Commands with machine-readable output formats such as `json`, `junit`, `checkstyle`, and `sarif` now report configuration problems too, instead of hiding them.
A configuration file that fails to load now reports "Failed to load the configuration file" instead of a message written for API descriptions.
