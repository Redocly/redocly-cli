---
'@redocly/respect-core': patch
---

Fixed an issue where the `verboseLog` of a step in the Respect results kept path parameter placeholders, such as `{orderId}`, in `host` instead of the values sent in the request.
