---
'@redocly/respect-core': minor
'@redocly/cli': minor
---

Added the `RESPONSE_HEADER_CHECK` to Respect. When a step is connected to an OpenAPI operation, Respect fails the step if the response misses a header marked as `required` in the description. To relax the check, use `--severity RESPONSE_HEADER_CHECK=warn` or `--severity RESPONSE_HEADER_CHECK=off`.
