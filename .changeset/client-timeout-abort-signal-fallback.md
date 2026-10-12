---
'@redocly/client-generator': patch
'@redocly/cli': patch
---

Fixed the generated TypeScript client so that requests with a `timeout` work in browsers that lack `AbortSignal.timeout()` or `AbortSignal.any()`, such as Chrome before 116, Safari before 17.4, and Firefox before 124.
A timed-out attempt now surfaces as `TimeoutError` in Chrome 103 to 123 too, where the browser aborts it with `AbortError`.
