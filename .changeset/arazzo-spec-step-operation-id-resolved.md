---
'@redocly/openapi-core': minor
'@redocly/cli': minor
---

Added the `spec-step-operationId-resolved` rule for Arazzo descriptions.
The rule reports a step whose `operationId` does not resolve to an operation in an OpenAPI source description.
To check that, `lint` now loads the OpenAPI source descriptions of an Arazzo description.
