---
'@redocly/cli': patch
---

Fixed the `preview` command previewing the whole project when it was started with `npx` from a subdirectory.
The project directory is now resolved from where the command was invoked and passed to the preview server explicitly.
