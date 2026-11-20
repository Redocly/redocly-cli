---
'@redocly/cli': patch
---

Changed the `generate-client` command so that a file path does not take the `clientOutput` of the API whose `root` it is, as `bundle` does with `output`.

**Note:** to keep writing to `clientOutput`, pass the alias of the API to the command.
