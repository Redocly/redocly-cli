---
'@redocly/cli': patch
---

Fixed the `project clone` command so that Git keeps finding its credential helper after a clone run with `npx` or `pnpm dlx`.
