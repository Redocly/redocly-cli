---
'@redocly/openapi-core': minor
'@redocly/cli': minor
---

Added a new built-in rule `spec-ref-targets` that requires AsyncAPI 3 `$ref`s to point to the locations the specification mandates.
The rule checks that operation and reply `channel` references point to root channels, their `messages` references point to the referenced channel's messages, and channel `servers` references point to root servers.
