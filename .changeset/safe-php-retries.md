---
'@redocly/client-generator': patch
'@redocly/cli': patch
---

Fixed an issue where the generated PHP client retried requests that the Go, Python, and TypeScript clients do not retry.
The default retry now applies only to safe methods or requests with an `Idempotency-Key`, and only after a transport error or a `408`, `429`, `500`, `502`, `503`, or `504`.

**Note:** A `POST` or `PATCH` without an `Idempotency-Key` is not retried any more, and neither is a `501` or a `505` to `599`.
