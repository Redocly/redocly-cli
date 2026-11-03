---
'@redocly/client-generator': minor
'@redocly/cli': minor
---

Added the `--report` option to the `generate-client` command.
It writes a JSON file with the operations of each API and the warnings of the run, each with a stable kind.
A custom or ejected generator gets `reportFinding` in its `run` input, to add its own warnings to the report.
