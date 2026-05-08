---
"@redocly/openapi-core": minor
"@redocly/respect-core": minor
"@redocly/cli": minor
---

Added the `spec-parameters-in-by-context` Arazzo rule, which validates that a parameter's `in` field is specified when the parent step, success action, or failure action does not reference a `workflowId`. Extended success and failure action objects to accept a `parameters` property that maps to workflow inputs.
