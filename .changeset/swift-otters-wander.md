---
"@redocly/openapi-core": minor
"@redocly/respect-core": minor
"@redocly/cli": minor
---

Added the `spec-parameters-in-by-context` Arazzo rule, which validates that a parameter's `in` field is specified when the parent workflow, step, success action, or failure action does not reference a `workflowId`. Extended success and failure action objects to accept a `parameters` property that maps to workflow inputs.

Note: because this rule is part of the `spec` ruleset (and is set to `error` in `recommended-strict` and `all`), linting Arazzo descriptions that omit a required `in` field, or that specify `in` when referencing a `workflowId`, may now report new errors.
