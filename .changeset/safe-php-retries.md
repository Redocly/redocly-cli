---
'@redocly/client-generator': patch
'@redocly/cli': patch
---

Fixed an issue where the generated PHP client retried a `POST` or `PATCH` without an `Idempotency-Key`, and retried a `501` or a `505` to `599`.
The default retry follows the same rule as the other generated clients.

**Note:** To retry a `POST` or `PATCH`, pass an `idempotencyKey` to the call, or pass a `retryOn` callable in `Config->retry`.
