---
'@redocly/client-generator': minor
'@redocly/cli': minor
---

Added support for `errorMode: result` to the `tanstack-query` and `swr` generators of the `generate-client` command, so that you can generate them together with a `typescript` client that returns `{ data, error, response }`.
