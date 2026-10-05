---
'@redocly/cli': patch
'@redocly/openapi-core': patch
---

Improved the consistency of how configuration file problems are reported.
Commands with machine-readable output formats, such as `json`, `junit`, `checkstyle`, and `sarif` also report configuration file problems instead of hiding them.
A configuration file that fails to load displays a specific error message instead of a generic one.

**Note**: Configuration file problems are printed to `stderr` in the `codeframe` format for every command, regardless of the `--format` option.
