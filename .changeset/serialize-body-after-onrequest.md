---
'@redocly/client-generator': patch
'@redocly/cli': patch
---

`generate-client`: the generated client now serializes the request body **after** the `onRequest` middleware chain runs, so a middleware that mutates `ctx.body` (enveloping, signing, case conversion) has its change sent. Previously the body was serialized before `onRequest`, silently dropping such mutations.
