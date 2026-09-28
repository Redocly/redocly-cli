---
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Fixed `respect` so known secrets are masked in non-JSON request bodies, such as `application/x-www-form-urlencoded` token requests.
