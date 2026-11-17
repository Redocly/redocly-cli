---
'@redocly/openapi-core': minor
'@redocly/cli': minor
'@redocly/respect-core': minor
---

Added the `spec-outputs-invalid-map-name` rule for Arazzo descriptions.
The rule reports a workflow or step output name that does not match the regular expression `^[a-zA-Z0-9\.\-_]+$`, as the Arazzo specification requires.

**Note:** the `recommended`, `recommended-strict`, and `spec` rulesets report such a name as an error, and Respect does not run a description that contains one.
Rename the output, or set the rule to `off` to keep linting as before.
