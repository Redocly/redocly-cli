---
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Fixed an issue where `respect` sent `[object Object]` instead of a form when a step did not set `contentType: multipart/form-data` in its `requestBody`, and the content type came from the OpenAPI operation or from a `Content-Type` header parameter.
A `$file(...)` reference in the payload of such a step is loaded as a file when the request body of the operation is `multipart/form-data`.
