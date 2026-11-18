---
'@redocly/openapi-core': minor
'@redocly/cli': minor
---

Changed the built-in rulesets to enable `spec-example-values` instead of the deprecated `no-example-value-and-externalValue` rule, so an example with both `value` and `externalValue` is no longer reported twice.
The deprecated rule still works when it is set in `redocly.yaml`, and the configuration linter now warns about it.

**Note:** Replace `no-example-value-and-externalValue` with `spec-example-values` in your `redocly.yaml`, because `off` for the deprecated rule does not turn off `spec-example-values`.
Regenerate the ignore file if it lists either rule.
