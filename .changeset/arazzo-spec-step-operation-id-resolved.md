---
'@redocly/openapi-core': minor
'@redocly/respect-core': minor
'@redocly/cli': minor
---

Added the `spec-step-operationId-resolved` rule for Arazzo descriptions.
The rule reports a step whose `operationId` does not resolve to an operation in an OpenAPI source description, or names an operation that several source descriptions define.
To check that, `lint` loads the OpenAPI source descriptions of an Arazzo description.
