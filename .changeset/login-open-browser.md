---
'@redocly/cli': patch
---

Updated the `login` command to prevent it from passing the authorization URL through a shell.

The `login` command no longer waits for the browser launcher to exit.
