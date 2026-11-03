---
'@redocly/client-generator': patch
'@redocly/cli': patch
---

Fixed type errors in the generated TypeScript client when a project's `tsconfig.json` does not include the `DOM` lib.
