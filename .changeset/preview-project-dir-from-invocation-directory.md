---
'@redocly/cli': patch
---

Fixed the `preview` command previewing the package root instead of the current directory when it was run through an `npm run` or `pnpm run` script from a subdirectory of the project.
