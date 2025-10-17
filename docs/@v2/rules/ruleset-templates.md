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
  array-parameter-serialization: off
  boolean-parameter-prefixes: off
  component-name-unique: off
  info-contact: off
  info-license: off
  info-license-strict: off
  no-ambiguous-paths: warn
  no-duplicated-tag-names: off
  no-empty-servers: warn
  no-enum-type-mismatch: warn
  no-http-verbs-in-paths: off
  no-identical-paths: warn
  no-invalid-media-type-examples: warn
  no-invalid-parameter-examples: off
  no-invalid-schema-examples: off
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
  operation-4xx-response: off
  operation-4xx-problem-details-rfc7807: off
  operation-description: off
  operation-operationId: warn
  operation-operationId-unique: warn
  operation-operationId-url-safe: warn
  operation-parameters-unique: warn
  operation-singular-tag: off
  operation-summary: warn
  operation-tag-defined: off
  parameter-description: off
  path-declaration-must-exist: warn
  path-http-verbs-order: off
  path-not-include-query: warn
  path-parameters-defined: warn
  path-params-defined: off
  path-segment-plural: off
  paths-kebab-case: off
  required-string-property-missing-min-length: off
  request-mime-type: off
  response-contains-header: off
  response-contains-property: off
  response-mime-type: off
  scalar-property-missing-example: off
  security-defined: warn
  spec-components-invalid-map-name: warn
  spec-discriminator-defaultMapping: off
  spec-example-values: off
  spec-no-invalid-encoding-combinations: warn
  spec-no-invalid-tag-parents: warn
  spec-strict-refs: off
  struct: error
  tag-description: warn
  tags-alphabetical: off
```

### Minimal ruleset: OpenAPI 3.1

```yaml
rules:
  array-parameter-serialization: off
  boolean-parameter-prefixes: off
  component-name-unique: off
  info-contact: off
  info-license: off
  info-license-strict: off
  no-ambiguous-paths: warn
  no-duplicated-tag-names: off
  no-empty-servers: warn
  no-enum-type-mismatch: warn
  no-example-value-and-externalValue: warn
  no-http-verbs-in-paths: off
  no-identical-paths: warn
  no-invalid-media-type-examples: warn
  no-invalid-parameter-examples: off
  no-invalid-schema-examples: off
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
  operation-4xx-response: off
  operation-4xx-problem-details-rfc7807: off
  operation-description: off
  operation-operationId: warn
  operation-operationId-unique: warn
  operation-operationId-url-safe: warn
  operation-parameters-unique: warn
  operation-singular-tag: off
  operation-summary: warn
  operation-tag-defined: off
  parameter-description: off
  path-declaration-must-exist: warn
  path-http-verbs-order: off
  path-not-include-query: warn
  path-parameters-defined: warn
  path-params-defined: off
  path-segment-plural: off
  paths-kebab-case: off
  required-string-property-missing-min-length: off
  request-mime-type: off
  response-contains-header: off
  response-contains-property: off
  response-mime-type: off
  scalar-property-missing-example: off
  security-defined: warn
  spec-components-invalid-map-name: warn
  spec-example-values: off
  spec-strict-refs: off
  struct: error
  tag-description: warn
  tags-alphabetical: off
```

### Minimal ruleset: OpenAPI 3.0

```yaml
rules:
  array-parameter-serialization: off
  boolean-parameter-prefixes: off
  component-name-unique: off
  info-contact: off
  info-license: off
  info-license-strict: off
  no-ambiguous-paths: warn
  no-duplicated-tag-names: off
  no-empty-servers: warn
  no-enum-type-mismatch: warn
  no-example-value-and-externalValue: warn
  no-http-verbs-in-paths: off
  no-identical-paths: warn
  no-invalid-media-type-examples: warn
  no-invalid-parameter-examples: off
  no-invalid-schema-examples: off
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
  operation-4xx-response: off
  operation-4xx-problem-details-rfc7807: off
  operation-description: off
  operation-operationId: warn
  operation-operationId-unique: warn
  operation-operationId-url-safe: warn
  operation-parameters-unique: warn
  operation-singular-tag: off
  operation-summary: warn
  operation-tag-defined: off
  parameter-description: off
  path-declaration-must-exist: warn
  path-http-verbs-order: off
  path-not-include-query: warn
  path-parameters-defined: warn
  path-params-defined: off
  path-segment-plural: off
  paths-kebab-case: off
  required-string-property-missing-min-length: off
  request-mime-type: off
  response-contains-header: off
  response-contains-property: off
  response-mime-type: off
  scalar-property-missing-example: off
  security-defined: warn
  spec-components-invalid-map-name: warn
  spec-example-values: off
  spec-strict-refs: off
  struct: error
  tag-description: warn
  tags-alphabetical: off
```

### Minimal ruleset: OpenAPI 2.0

```yaml
rules:
  boolean-parameter-prefixes: off
  info-contact: off
  info-license: off
  info-license-strict: off
  no-ambiguous-paths: warn
  no-duplicated-tag-names: off
  no-enum-type-mismatch: warn
  no-http-verbs-in-paths: off
  no-identical-paths: warn
  no-invalid-parameter-examples: off
  no-invalid-schema-examples: off
  no-path-trailing-slash: warn
  no-required-schema-properties-undefined: warn
  no-schema-type-mismatch: warn
  no-unresolved-refs: error
  operation-2xx-response: warn
  operation-4xx-response: off
  operation-description: off
  operation-operationId: warn
  operation-operationId-unique: warn
  operation-operationId-url-safe: warn
  operation-parameters-unique: warn
  operation-singular-tag: off
  operation-summary: warn
  operation-tag-defined: off
  parameter-description: off
  path-declaration-must-exist: warn
  path-http-verbs-order: off
  path-not-include-query: warn
  path-parameters-defined: warn
  path-params-defined: off
  path-segment-plural: off
  paths-kebab-case: off
  required-string-property-missing-min-length: off
  request-mime-type: off
  response-contains-header: off
  response-contains-property: off
  response-mime-type: off
  scalar-property-missing-example: off
  security-defined: warn
  spec-strict-refs: off
  struct: error
  tag-description: warn
  tags-alphabetical: off
```

### Minimal ruleset: AsyncAPI 3.0

```yaml
rules:
  channels-kebab-case: off
  info-contact: off
  info-license-strict: off
  no-channel-trailing-slash: off
  no-duplicated-tag-names: off
  no-enum-type-mismatch: warn
  no-required-schema-properties-undefined: warn
  no-schema-type-mismatch: warn
  operation-operationId: warn
  struct: error
  tag-description: warn
  tags-alphabetical: off
```

### Minimal ruleset: AsyncAPI 2.6

```yaml
rules:
  channels-kebab-case: off
  info-contact: off
  info-license-strict: off
  no-channel-trailing-slash: off
  no-duplicated-tag-names: off
  no-enum-type-mismatch: warn
  no-required-schema-properties-undefined: warn
  no-schema-type-mismatch: warn
  operation-operationId: warn
  struct: error
  tag-description: warn
  tags-alphabetical: off
```

### Minimal ruleset: Arazzo 1.0

```yaml
rules:
  criteria-unique: off
  no-criteria-xpath: off
  no-enum-type-mismatch: warn
  no-required-schema-properties-undefined: warn
  no-schema-type-mismatch: warn
  no-x-security-scheme-name-in-workflow: off
  no-x-security-scheme-name-without-openapi: off
  parameters-unique: off
  requestBody-replacements-unique: off
  respect-supported-versions: off
  sourceDescription-name-unique: off
  sourceDescription-type: off
  sourceDescriptions-not-empty: off
  step-onFailure-unique: off
  step-onSuccess-unique: off
  stepId-unique: error
  struct: error
  workflow-dependsOn: off
  workflowId-unique: error
  x-security-scheme-required-values: off
```

## Recommended rulesets

The default behavior is to use a recommended ruleset.
The recommended rulesets for each format are listed below.
There is also a "recommended-strict" ruleset which is identical but with all `warn` settings changed to `error`.

### Recommended ruleset: OpenAPI 3.2

```yaml
rules:
  array-parameter-serialization: off
  boolean-parameter-prefixes: off
  component-name-unique: off
  info-contact: off
  info-license: warn
  info-license-strict: warn
  no-ambiguous-paths: warn
  no-duplicated-tag-names: warn
  no-empty-servers: error
  no-enum-type-mismatch: error
  no-http-verbs-in-paths: off
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
  operation-4xx-problem-details-rfc7807: off
  operation-description: off
  operation-operationId: warn
  operation-operationId-unique: error
  operation-operationId-url-safe: error
  operation-parameters-unique: error
  operation-singular-tag: off
  operation-summary: error
  operation-tag-defined: off
  parameter-description: off
  path-declaration-must-exist: error
  path-http-verbs-order: off
  path-not-include-query: error
  path-parameters-defined: error
  path-params-defined: error
  path-segment-plural: off
  paths-kebab-case: off
  required-string-property-missing-min-length: off
  request-mime-type: off
  response-contains-header: off
  response-contains-property: off
  response-mime-type: off
  scalar-property-missing-example: off
  security-defined: error
  spec-components-invalid-map-name: error
  spec-discriminator-defaultMapping: warn
  spec-example-values: error
  spec-no-invalid-encoding-combinations: error
  spec-no-invalid-tag-parents: error
  spec-strict-refs: off
  struct: error
  tag-description: warn
  tags-alphabetical: off
```

### Recommended ruleset: OpenAPI 3.1

```yaml
rules:
  array-parameter-serialization: off
  boolean-parameter-prefixes: off
  component-name-unique: off
  info-contact: off
  info-license: warn
  info-license-strict: warn
  no-ambiguous-paths: warn
  no-duplicated-tag-names: warn
  no-empty-servers: error
  no-enum-type-mismatch: error
  no-example-value-and-externalValue: error
  no-http-verbs-in-paths: off
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
  operation-4xx-problem-details-rfc7807: off
  operation-description: off
  operation-operationId: warn
  operation-operationId-unique: error
  operation-operationId-url-safe: error
  operation-parameters-unique: error
  operation-singular-tag: off
  operation-summary: error
  operation-tag-defined: off
  parameter-description: off
  path-declaration-must-exist: error
  path-http-verbs-order: off
  path-not-include-query: error
  path-parameters-defined: error
  path-params-defined: error
  path-segment-plural: off
  paths-kebab-case: off
  required-string-property-missing-min-length: off
  request-mime-type: off
  response-contains-header: off
  response-contains-property: off
  response-mime-type: off
  scalar-property-missing-example: off
  security-defined: error
  spec-components-invalid-map-name: error
  spec-example-values: off
  spec-strict-refs: off
  struct: error
  tag-description: warn
  tags-alphabetical: off
```

### Recommended ruleset: OpenAPI 3.0

```yaml
rules:
  array-parameter-serialization: off
  boolean-parameter-prefixes: off
  component-name-unique: off
  info-contact: off
  info-license: warn
  info-license-strict: warn
  no-ambiguous-paths: warn
  no-duplicated-tag-names: warn
  no-empty-servers: error
  no-enum-type-mismatch: error
  no-example-value-and-externalValue: error
  no-http-verbs-in-paths: off
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
  operation-4xx-problem-details-rfc7807: off
  operation-description: off
  operation-operationId: warn
  operation-operationId-unique: error
  operation-operationId-url-safe: error
  operation-parameters-unique: error
  operation-singular-tag: off
  operation-summary: error
  operation-tag-defined: off
  parameter-description: off
  path-declaration-must-exist: error
  path-http-verbs-order: off
  path-not-include-query: error
  path-parameters-defined: error
  path-params-defined: error
  path-segment-plural: off
  paths-kebab-case: off
  required-string-property-missing-min-length: off
  request-mime-type: off
  response-contains-header: off
  response-contains-property: off
  response-mime-type: off
  scalar-property-missing-example: off
  security-defined: error
  spec-components-invalid-map-name: error
  spec-example-values: off
  spec-strict-refs: off
  struct: error
  tag-description: warn
  tags-alphabetical: off
```

### Recommended ruleset: OpenAPI 2.0

```yaml
rules:
  boolean-parameter-prefixes: off
  info-contact: off
  info-license: warn
  info-license-strict: warn
  no-ambiguous-paths: warn
  no-duplicated-tag-names: warn
  no-enum-type-mismatch: error
  no-http-verbs-in-paths: off
  no-identical-paths: error
  no-invalid-parameter-examples: warn
  no-invalid-schema-examples: warn
  no-path-trailing-slash: error
  no-required-schema-properties-undefined: warn
  no-schema-type-mismatch: error
  no-unresolved-refs: error
  operation-2xx-response: warn
  operation-4xx-response: warn
  operation-description: off
  operation-operationId: warn
  operation-operationId-unique: error
  operation-operationId-url-safe: error
  operation-parameters-unique: error
  operation-singular-tag: off
  operation-summary: error
  operation-tag-defined: off
  parameter-description: off
  path-declaration-must-exist: error
  path-http-verbs-order: off
  path-not-include-query: error
  path-parameters-defined: error
  path-params-defined: error
  path-segment-plural: off
  paths-kebab-case: off
  required-string-property-missing-min-length: off
  request-mime-type: off
  response-contains-header: off
  response-contains-property: off
  response-mime-type: off
  scalar-property-missing-example: off
  security-defined: error
  spec-strict-refs: off
  struct: error
  tag-description: warn
  tags-alphabetical: off
```

### Recommended ruleset: AsyncAPI 3.0

```yaml
rules:
  channels-kebab-case: off
  info-contact: off
  info-license-strict: warn
  no-channel-trailing-slash: off
  no-duplicated-tag-names: warn
  no-enum-type-mismatch: error
  no-required-schema-properties-undefined: warn
  no-schema-type-mismatch: error
  operation-operationId: warn
  struct: error
  tag-description: warn
  tags-alphabetical: off
```

### Recommended ruleset: AsyncAPI 2.6

```yaml
rules:
  channels-kebab-case: off
  info-contact: off
  info-license-strict: warn
  no-channel-trailing-slash: off
  no-duplicated-tag-names: warn
  no-enum-type-mismatch: error
  no-required-schema-properties-undefined: warn
  no-schema-type-mismatch: error
  operation-operationId: warn
  struct: error
  tag-description: warn
  tags-alphabetical: off
```

### Recommended ruleset: Arazzo 1.0

```yaml
rules:
  criteria-unique: warn
  no-criteria-xpath: off
  no-enum-type-mismatch: error
  no-required-schema-properties-undefined: warn
  no-schema-type-mismatch: error
  no-x-security-scheme-name-in-workflow: off
  no-x-security-scheme-name-without-openapi: off
  parameters-unique: error
  requestBody-replacements-unique: warn
  respect-supported-versions: off
  sourceDescription-name-unique: error
  sourceDescription-type: error
  sourceDescriptions-not-empty: error
  step-onFailure-unique: warn
  step-onSuccess-unique: warn
  stepId-unique: error
  struct: error
  workflow-dependsOn: error
  workflowId-unique: error
  x-security-scheme-required-values: off
```

## Resources

- Learn about [API governance](../api-standards.md).
- More information and examples for individual rules can be found in the [built-in rules documentation](./built-in-rules.md).
- Add your own [configurable rules](./configurable-rules.md) if there's anything you need that isn't already provided as a built in rule.
