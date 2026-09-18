---
'@redocly/cli': patch
---

Made commands start faster: they now load only the code the command needs.
Reading the npm version for usage data no longer starts npm in a shell.
