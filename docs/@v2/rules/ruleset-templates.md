# Ruleset templates

Redocly CLI includes some default rulesets to get you started quickly.

To edit/adjust the rules you use in your own projects, [configure your rules](./configure-rules.md) accordingly to override any settings from the original ruleset.

On this page, each ruleset is included for each of the supported API description formats.
You can use this information for your own reference, or copy/paste them in order to use [separate configuration for each API](../configuration/apis.md).
Consult the format-specific sections below, each code sample is formatted to be included in `redocly.yaml` directly.

More information and examples for individual rules can be found in the [built-in rules documentation](./built-in-rules.md).

## Minimal rulesets

The minimal rulesets are a decent baseline that you can use to selective enable more rules or extend rulesets from.

### Minimal ruleset: OpenAPI 3.2

```yaml
rules:
  no-ambiguous-paths: warn
  no-empty-servers: warn
  no-enum-type-mismatch: warn
  no-identical-paths: warn
  no-invalid-media-type-examples: warn
  no-path-trailing-slash: warn
  no-required-schema-properties-undefined: warn
  no-schema-type-mismatch: warn
  no-server-example.com: warn
  no-server-trailing-slash: error
  no-server-variables-empty-enum: error
  no-unresolved-refs: error
  no-unused-components: warn
  no-undefined-server-variable: warn
  operation-2xx-response: warn
  operation-operationId: warn
  operation-operationId-unique: warn
  operation-operationId-url-safe: warn
  operation-parameters-unique: warn
  operation-summary: warn
  path-declaration-must-exist: warn
  path-not-include-query: warn
  path-parameters-defined: warn
  security-defined: warn
  spec-components-invalid-map-name: warn
  spec-no-invalid-encoding-combinations: warn
  spec-no-invalid-tag-parents: warn
  struct: error
  tag-description: warn
```

### Minimal ruleset: OpenAPI 3.1

```yaml
rules:
  no-ambiguous-paths: warn
  no-empty-servers: warn
  no-enum-type-mismatch: warn
  no-example-value-and-externalValue: warn
  no-identical-paths: warn
  no-invalid-media-type-examples: warn
  no-path-trailing-slash: warn
  no-required-schema-properties-undefined: warn
  no-schema-type-mismatch: warn
  no-server-example.com: warn
  no-server-trailing-slash: error
  no-server-variables-empty-enum: error
  no-unresolved-refs: error
  no-unused-components: warn
  no-undefined-server-variable: warn
  operation-2xx-response: warn
  operation-operationId: warn
  operation-operationId-unique: warn
  operation-operationId-url-safe: warn
  operation-parameters-unique: warn
  operation-summary: warn
  path-declaration-must-exist: warn
  path-not-include-query: warn
  path-parameters-defined: warn
  security-defined: warn
  spec-components-invalid-map-name: warn
  struct: error
  tag-description: warn
```

### Minimal ruleset: OpenAPI 3.0

```yaml
rules:
  no-ambiguous-paths: warn
  no-empty-servers: warn
  no-enum-type-mismatch: warn
  no-example-value-and-externalValue: warn
  no-identical-paths: warn
  no-invalid-media-type-examples: warn
  no-path-trailing-slash: warn
  no-required-schema-properties-undefined: warn
  no-schema-type-mismatch: warn
  no-server-example.com: warn
  no-server-trailing-slash: error
  no-server-variables-empty-enum: error
  no-unresolved-refs: error
  no-unused-components: warn
  no-undefined-server-variable: warn
  nullable-type-sibling: warn
  operation-2xx-response: warn
  operation-operationId: warn
  operation-operationId-unique: warn
  operation-operationId-url-safe: warn
  operation-parameters-unique: warn
  operation-summary: warn
  path-declaration-must-exist: warn
  path-not-include-query: warn
  path-parameters-defined: warn
  security-defined: warn
  spec-components-invalid-map-name: warn
  struct: error
  tag-description: warn
```

### Minimal ruleset: OpenAPI 2.0

```yaml
rules:
  no-ambiguous-paths: warn
  no-enum-type-mismatch: warn
  no-identical-paths: warn
  no-path-trailing-slash: warn
  no-required-schema-properties-undefined: warn
  no-schema-type-mismatch: warn
  no-unresolved-refs: error
  operation-2xx-response: warn
  operation-operationId: warn
  operation-operationId-unique: warn
  operation-operationId-url-safe: warn
  operation-parameters-unique: warn
  operation-summary: warn
  path-declaration-must-exist: warn
  path-not-include-query: warn
  path-parameters-defined: warn
  security-defined: warn
  struct: error
  tag-description: warn
```

### Minimal ruleset: AsyncAPI 3.0

```yaml
rules:
  no-enum-type-mismatch: warn
  no-required-schema-properties-undefined: warn
  no-schema-type-mismatch: warn
  operation-operationId: warn
  struct: error
  tag-description: warn
```

### Minimal ruleset: AsyncAPI 2.6

```yaml
rules:
  no-enum-type-mismatch: warn
  no-required-schema-properties-undefined: warn
  no-schema-type-mismatch: warn
  operation-operationId: warn
  struct: error
  tag-description: warn
```

### Minimal ruleset: Arazzo 1.0

```yaml
rules:
  no-enum-type-mismatch: warn
  no-required-schema-properties-undefined: warn
  no-schema-type-mismatch: warn
  stepId-unique: error
  struct: error
  workflowId-unique: error
```

## Recommended rulesets

The default behavior is to use a recommended ruleset.
The recommended rulesets for each format are listed below.
There is also a "recommended-strict" ruleset which is identical but with all `warn` settings changed to `error`.

### Recommended ruleset: OpenAPI 3.2

```yaml
rules:
  info-license: warn
  info-license-strict: warn
  no-ambiguous-paths: warn
  no-duplicated-tag-names: warn
  no-empty-servers: error
  no-enum-type-mismatch: error
  no-identical-paths: error
  no-invalid-media-type-examples: warn
  no-invalid-parameter-examples: warn
  no-invalid-schema-examples: warn
  no-path-trailing-slash: error
  no-required-schema-properties-undefined: warn
  no-schema-type-mismatch: error
  no-server-example.com: warn
  no-server-trailing-slash: error
  no-server-variables-empty-enum: error
  no-unresolved-refs: error
  no-unused-components: warn
  no-undefined-server-variable: error
  operation-2xx-response: warn
  operation-4xx-response: warn
  operation-operationId: warn
  operation-operationId-unique: error
  operation-operationId-url-safe: error
  operation-parameters-unique: error
  operation-summary: error
  path-declaration-must-exist: error
  path-not-include-query: error
  path-parameters-defined: error
  path-params-defined: error
  security-defined: error
  spec-components-invalid-map-name: error
  spec-discriminator-defaultMapping: warn
  spec-example-values: error
  spec-no-invalid-encoding-combinations: error
  spec-no-invalid-tag-parents: error
  struct: error
  tag-description: warn
```

### Recommended ruleset: OpenAPI 3.1

```yaml
rules:
  info-license: warn
  info-license-strict: warn
  no-ambiguous-paths: warn
  no-duplicated-tag-names: warn
  no-empty-servers: error
  no-enum-type-mismatch: error
  no-example-value-and-externalValue: error
  no-identical-paths: error
  no-invalid-media-type-examples: warn
  no-invalid-parameter-examples: warn
  no-invalid-schema-examples: warn
  no-path-trailing-slash: error
  no-required-schema-properties-undefined: warn
  no-schema-type-mismatch: error
  no-server-example.com: warn
  no-server-trailing-slash: error
  no-server-variables-empty-enum: error
  no-unresolved-refs: error
  no-unused-components: warn
  no-undefined-server-variable: error
  operation-2xx-response: warn
  operation-4xx-response: warn
  operation-operationId: warn
  operation-operationId-unique: error
  operation-operationId-url-safe: error
  operation-parameters-unique: error
  operation-summary: error
  path-declaration-must-exist: error
  path-not-include-query: error
  path-parameters-defined: error
  path-params-defined: error
  security-defined: error
  spec-components-invalid-map-name: error
  struct: error
  tag-description: warn
```

### Recommended ruleset: OpenAPI 3.0

```yaml
rules:
  info-license: warn
  info-license-strict: warn
  no-ambiguous-paths: warn
  no-duplicated-tag-names: warn
  no-empty-servers: error
  no-enum-type-mismatch: error
  no-example-value-and-externalValue: error
  no-identical-paths: error
  no-invalid-media-type-examples: warn
  no-invalid-parameter-examples: warn
  no-invalid-schema-examples: warn
  no-path-trailing-slash: error
  no-required-schema-properties-undefined: warn
  no-schema-type-mismatch: error
  no-server-example.com: warn
  no-server-trailing-slash: error
  no-server-variables-empty-enum: error
  no-unresolved-refs: error
  no-unused-components: warn
  no-undefined-server-variable: error
  nullable-type-sibling: error
  operation-2xx-response: warn
  operation-4xx-response: warn
  operation-operationId: warn
  operation-operationId-unique: error
  operation-operationId-url-safe: error
  operation-parameters-unique: error
  operation-summary: error
  path-declaration-must-exist: error
  path-not-include-query: error
  path-parameters-defined: error
  path-params-defined: error
  security-defined: error
  spec-components-invalid-map-name: error
  struct: error
  tag-description: warn
```

### Recommended ruleset: OpenAPI 2.0

```yaml
rules:
  info-license: warn
  info-license-strict: warn
  no-ambiguous-paths: warn
  no-duplicated-tag-names: warn
  no-enum-type-mismatch: error
  no-identical-paths: error
  no-invalid-parameter-examples: warn
  no-invalid-schema-examples: warn
  no-path-trailing-slash: error
  no-required-schema-properties-undefined: warn
  no-schema-type-mismatch: error
  no-unresolved-refs: error
  operation-2xx-response: warn
  operation-4xx-response: warn
  operation-operationId: warn
  operation-operationId-unique: error
  operation-operationId-url-safe: error
  operation-parameters-unique: error
  operation-summary: error
  path-declaration-must-exist: error
  path-not-include-query: error
  path-parameters-defined: error
  path-params-defined: error
  security-defined: error
  struct: error
  tag-description: warn
```

### Recommended ruleset: AsyncAPI 3.0

```yaml
rules:
  info-license-strict: warn
  no-duplicated-tag-names: warn
  no-enum-type-mismatch: error
  no-required-schema-properties-undefined: warn
  no-schema-type-mismatch: error
  operation-operationId: warn
  struct: error
  tag-description: warn
```

### Recommended ruleset: AsyncAPI 2.6

```yaml
rules:
  info-license-strict: warn
  no-duplicated-tag-names: warn
  no-enum-type-mismatch: error
  no-required-schema-properties-undefined: warn
  no-schema-type-mismatch: error
  operation-operationId: warn
  struct: error
  tag-description: warn
```

### Recommended ruleset: Arazzo 1.0

```yaml
rules:
  criteria-unique: warn
  no-enum-type-mismatch: error
  no-required-schema-properties-undefined: warn
  no-schema-type-mismatch: error
  outputs-defined: error
  parameters-unique: error
  requestBody-replacements-unique: warn
  sourceDescription-name-unique: error
  sourceDescription-type: error
  sourceDescriptions-not-empty: error
  step-onFailure-unique: warn
  step-onSuccess-unique: warn
  stepId-unique: error
  struct: error
  workflow-dependsOn: error
  workflowId-unique: error
```

## Resources

- Learn about [API governance](../api-standards.md).
- More information and examples for individual rules can be found in the [built-in rules documentation](./built-in-rules.md).
- Add your own [configurable rules](./configurable-rules.md) if there's anything you need that isn't already provided as a built in rule.
