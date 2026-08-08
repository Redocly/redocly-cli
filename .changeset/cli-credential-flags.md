---
'@redocly/client-generator': patch
---

Fixed the generated CLI advertising `--token` and the bearer environment variable on APIs that declare no bearer scheme, and silently discarding a token passed to them; the credential help now follows the description, and an unusable `--token` is a usage error naming the schemes the API accepts.
