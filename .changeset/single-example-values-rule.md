---
'@redocly/openapi-core': minor
'@redocly/cli': minor
---

Made `spec-example-values` the only rule that checks the field combinations of an Example Object.
The built-in rulesets now enable it for OpenAPI 3.0 and 3.1 instead of the deprecated `no-example-value-and-externalValue` rule, which stays as an alias and produces a deprecation warning in `redocly.yaml`.
Fixed an issue where an example with `externalValue` and a `value` of `0`, `false`, `null`, or an empty string was not reported, and fixed a typo in the rule messages.

**Note:** problems that the rulesets reported as `no-example-value-and-externalValue` are now reported as `spec-example-values`.
Rename the rule in your `redocly.yaml` and regenerate the ignore file if it lists the old rule.
