---
'@redocly/cli': minor
---

Changed the `bundle` command so that the `--output` option takes precedence over the `output` option of an API in `redocly.yaml`.
The precedence applies when you pass the API to the command, for example `redocly bundle <api> --output <file>`.

**Note:** To keep writing the bundle to the `output` path from `redocly.yaml`, remove `--output` from the command.
