---
'@redocly/client-generator': patch
'@redocly/cli': patch
---

Fixed type errors in the generated TypeScript client when a project's `tsconfig.json` didn't include the `DOM` lib.
