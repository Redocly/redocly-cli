---
'@redocly/client-generator': patch
'@redocly/cli': patch
---

Fixed an issue where the generated PHP client threw `TimeoutError` for a refused connection and did not retry other network errors.
