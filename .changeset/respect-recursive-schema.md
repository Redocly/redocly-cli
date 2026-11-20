---
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Fixed an issue where Respect failed a step with the `Maximum call stack size exceeded` error when a request or a response was described with a recursive schema.
Respect now checks a response against a recursive schema instead of skipping the schema check with a warning.
