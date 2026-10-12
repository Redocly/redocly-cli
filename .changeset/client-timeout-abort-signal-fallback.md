---
'@redocly/client-generator': patch
'@redocly/cli': patch
---

Fixed request timeouts in the generated TypeScript client for older browsers that don't support `AbortSignal.timeout()` or `AbortSignal.any()`. Timed-out requests now correctly throw `TimeoutError` instead of `AbortError` in Chrome 103–123.
