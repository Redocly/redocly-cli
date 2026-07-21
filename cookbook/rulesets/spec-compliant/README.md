# spec-compliant ruleset

Authors:

- `@CidTori`

## What this does and why

This ruleset uses the current built-in rules to stick closely to the spec.

It's an unopinionated good default.

REQUIRED rules (in the spec) are set to `error`, RECOMMENDED rules to `warn`.

## Code

You can use it in your `redocly.yaml` wih [`extends`](https://redocly.com/docs/cli/configuration/extends/), or you can copy its content directly:

```yaml
rules:
  struct: error
  nullable-type-sibling: error
  spec-strict-refs: error
  no-undefined-server-variable: error
  path-not-include-query: error
  path-declaration-must-exist: error
  no-identical-paths: error
  path-parameters-defined: error
  operation-operationId-url-safe: warn
  operation-operationId-unique: error
  operation-parameters-unique: error
  operation-2xx-response: warn
  no-invalid-parameter-examples: warn
  no-invalid-media-type-examples: warn
  no-invalid-schema-examples: warn
  no-example-value-and-externalValue: error
  no-unresolved-refs: error
  spec-components-invalid-map-name: error
```

## References

Here is why each rule is included:

- `struct`: [ensures structural correctness](https://redocly.com/docs/cli/rules/spec/#api-design-principles)
- `nullable-type-sibling`: [ensures compliance with the OpenAPI 3.0 spec](https://redocly.com/docs/cli/rules/oas/nullable-type-sibling)
- `spec-strict-refs`: ["strict adherence to the specifications"](https://redocly.com/docs/cli/rules/spec-strict-refs/#api-design-principles)
- `no-undefined-server-variable`: ["it's an error with the specification"](https://redocly.com/docs/cli/rules/no-undefined-server-variable/#api-design-principles)
- `path-declaration-must-exist`: ["This rule is for spec correctness"](https://redocly.com/docs/cli/rules/path-declaration-must-exist/#api-design-principles)
- `no-identical-paths`: ["Templated paths with the same hierarchy but different templated names MUST NOT exist as they are identical."](https://spec.openapis.org/oas/latest.html#patterned-fields)
- `path-not-include-query`: ["Each template expression in the path MUST correspond to a path parameter"](https://spec.openapis.org/oas/latest.html#path-templating)
- `path-parameters-defined`: ["Each template expression in the path MUST correspond to a path parameter"](https://spec.openapis.org/oas/latest.html#path-templating)
- `operation-operationId-url-safe` (debatable): ["it is RECOMMENDED to follow common programming naming conventions"](https://spec.openapis.org/oas/latest.html#fixed-fields-7)
- `operation-operationId-unique`: ["The id MUST be unique among all operations described in the API."](https://spec.openapis.org/oas/latest.html#fixed-fields-7)
- `operation-parameters-unique`: ["The list MUST NOT include duplicated parameters. A unique parameter is defined by a combination of a name and location."](https://spec.openapis.org/oas/latest.html#fixed-fields-7)
- `operation-2xx-response` (debatable): ["The Responses Object MUST contain at least one response code, and if only one response code is provided it SHOULD be the response for a successful operation call."](https://spec.openapis.org/oas/latest.html#responses-object)
- `no-invalid-parameter-examples`: ["The example SHOULD match the specified schema and encoding properties if present."](https://spec.openapis.org/oas/latest.html#fixed-fields-9)
- `no-invalid-media-type-examples`: ["The example object SHOULD be in the correct format as specified by the media type."](https://spec.openapis.org/oas/latest.html#fixed-fields-11)
- `no-invalid-schema-examples`: ["It is RECOMMENDED that these values be valid against the associated schema."](https://datatracker.ietf.org/doc/html/draft-bhutton-json-schema-validation-00#section-9.5)
- `no-example-value-and-externalValue`: ["The value field and externalValue field are mutually exclusive."](https://spec.openapis.org/oas/latest.html#fixed-fields-15)
- `no-unresolved-refs` (debatable): ["The referenced structure MUST be in the form of a Path Item Object."](https://spec.openapis.org/oas/latest.html#fixed-fields-6)
- `spec-components-invalid-map-name`: ["All the fixed fields declared above are objects that MUST use keys that match the regular expression: ^\[a-zA-Z0-9\.\-\_\]+$."](https://spec.openapis.org/oas/latest.html#fixed-fields-5)

Please, feel free to open issues or pull requests to suggest updates or additions to this ruleset.
