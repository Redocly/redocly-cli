---
'@redocly/client-generator': minor
'@redocly/cli': minor
---

Added pass-through stream request bodies to the generated TypeScript, Python, Go, and PHP clients.
A stream body is sent as is with the caller's `Content-Type`, in one attempt.
