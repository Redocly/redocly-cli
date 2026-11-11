---
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Fixed an issue where `respect` did not mask `format: password` fields of a request body or a response described under a wildcard media type, such as `*/*` or `application/*`.
