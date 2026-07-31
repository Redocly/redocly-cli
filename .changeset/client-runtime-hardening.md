---
'@redocly/client-generator': minor
---

Added three request-hardening options to generated clients: `timeout` aborts slow attempts (a fresh budget per retry attempt, composable with your own `AbortSignal`; failures surface as a structured `TimeoutError` carrying the operation, budget, and attempt), `idempotencyKey` stamps POST/PATCH requests with a stable `Idempotency-Key` header and makes their retries safe under the default policy, and an `X-Redocly-Client` identification header is sent outside browsers (override or disable it with `clientHeader`). The default retry predicate is now exported as `defaultRetryOn` so custom `retryOn` rules can compose with it instead of replacing it.
