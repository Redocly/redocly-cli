---
'@redocly/cli': patch
---

Fixed an issue where the `preview` command previewed the whole workspace package instead of the requested directory when a user ran it with `npx` in an npm workspace.
The issue occurred when the command ran from a subdirectory of the package, or when the `--project-dir` option pointed to a subdirectory.
