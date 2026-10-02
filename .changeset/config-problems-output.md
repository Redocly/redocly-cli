---
'@redocly/cli': patch
'@redocly/openapi-core': patch
---

Improved the consistency of how configuration file problems are reported.
Commands with machine-readable output formats, such as `json`, `junit`, `checkstyle`, and `sarif`, now report configuration file problems too, instead of hiding them.
A configuration file that fails to load now shows a specific error message instead of a generic one.

**Note**: Configuration file problems are now printed to `stderr` in the `codeframe` format for every command, regardless of the `--format` option.
