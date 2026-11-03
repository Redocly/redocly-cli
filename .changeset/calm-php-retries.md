---
'@redocly/client-generator': patch
'@redocly/cli': patch
---

Fixed an issue where the generated PHP client threw `TimeoutError` for a refused connection instead of a transport error.
