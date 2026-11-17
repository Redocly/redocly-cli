---
'@redocly/openapi-core': minor
'@redocly/cli': minor
---

Made `spec-example-values` the only rule that checks the field combinations of an Example Object, so the built-in rulesets enable it instead of the deprecated `no-example-value-and-externalValue` rule.
The deprecated name still works as an alias of `spec-example-values` and produces a deprecation warning.
Fixed an issue where an example with `externalValue` and a `value` of `0`, `false`, `null`, or an empty string was not reported.

**Note:** Rename `no-example-value-and-externalValue` to `spec-example-values` in your `redocly.yaml`, and regenerate the ignore file if it lists either rule.
Turning off either name now turns off all the Example Object checks.
