---
'@redocly/cli': minor
---

Changed the `bundle` command so that `--output` takes precedence over the `output` of the configuration file for an API passed in the command line.

**Warning:** `redocly bundle <alias> --output <file>` wrote to the `output` of that API before, and now writes to `--output`. Remove `--output` from the command to keep writing to the `output` of the configuration file.
