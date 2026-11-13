---
'@redocly/openapi-core': minor
'@redocly/cli': minor
---

Made `spec-example-values` the only rule that checks the field combinations of an Example Object.
The built-in rulesets now enable it for OpenAPI 3.0 and 3.1 instead of the deprecated `no-example-value-and-externalValue` rule.
The deprecated name stays as an alias: its setting in `redocly.yaml` is applied to `spec-example-values`, with a deprecation warning.
Fixed an issue where an example with `externalValue` and a `value` of `0`, `false`, `null`, or an empty string was not reported, and fixed a typo in the rule messages.

**Note:** these problems are now reported as `spec-example-values` and always point at the field key.
Rename the rule in your `redocly.yaml`, and regenerate the ignore file if it lists `no-example-value-and-externalValue` or `spec-example-values`.
Turning off either name now turns off all the Example Object checks, and under `rules` it applies to OpenAPI 3.0, 3.1, and 3.2.
To turn the checks off only for some versions, set the rule in `oas3_0Rules`, `oas3_1Rules`, or `oas3_2Rules`.
