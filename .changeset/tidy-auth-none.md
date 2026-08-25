---
'@redocly/cli': patch
---

`tree --format=ai` now reads `auth: none` for an operation that declares `security: []`, instead of an empty `auth:` line. An operation that opts out of the root security requirement is stating something, and the card has to carry it.
