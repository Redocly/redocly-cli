---
'@redocly/cli': patch
---

Changed the `generate-client` command to ignore the `clientOutput` option of an API when you pass the path to the API's `root` file instead of the API alias.

**Note:** To keep writing the client to the `clientOutput` path, pass the API alias to the command.
