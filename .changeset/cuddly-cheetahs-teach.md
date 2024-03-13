---
"@redocly/cli": patch
---

Fixed a problem with the `preview` command crashing on Windows by adding operating system detection for the correct `npx` executable to use.
