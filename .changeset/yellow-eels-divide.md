---
"@redocly/cli": patch
---

Fixed a problem where the `join` command with `--prefix-components-with-info-prop` was creating $refs with spaces by replacing them with underscores.
