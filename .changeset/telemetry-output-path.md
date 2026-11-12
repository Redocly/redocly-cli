---
'@redocly/cli': patch
---

Fixed an issue where the usage data included the type of the `--output` path, or the path as typed when the file did not exist.
The value is now hidden, as for the `-o` alias.
