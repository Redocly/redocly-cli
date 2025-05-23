# Ruleset templates

Redocly CLI includes some default rulesets to get you started quickly.

To edit/adjust the rules you use in your own projects, [configure your rules](./configure-rules.md) accordingly to override any settings from the original ruleset.

On this page, each ruleset is included for each of the supported API description formats.
You can use this information for your own reference, or copy/paste them in order to use [separate configuration for each API](../configuration/apis.md).
Consult the format-specific sections below, each code sample is formatted to be included in `redocly.yaml` directly.

More information and examples for individual rules can be found in the [built-in rules documentation](./built-in-rules.md).

## Minimal rulesets

The minimal rulesets are a decent baseline that you can use to selective enable more rules or extend rulesets from.

### Minimal ruleset: OpenAPI 3.1

```yaml
rules:
  info-contact: off
  info-license: off
  info-license-url: off
  info-license-strict: off
  tag-description: warn
  tags-alphabetical: off
  parameter-description: off
  no-path-trailing-slash: warn
  no-identical-paths: warn
  no-ambiguous-paths: warn
  path-declaration-must-exist: warn
  path-not-include-query: warn
  path-parameters-defined: warn
  operation-description: off
  operation-2xx-response: warn
  operation-4xx-response: off
  operation-operationId: warn
  operation-summary: warn
  operation-operationId-unique: warn
  operation-parameters-unique: warn
  operation-tag-defined: off
  security-defined: warn
  operation-operationId-url-safe: warn
  operation-singular-tag: off
  no-unresolved-refs: error
  no-enum-type-mismatch: warn
  paths-kebab-case: off
  struct: error
  spec-strict-refs: off
  no-http-verbs-in-paths: off
  no-invalid-parameter-examples: off
  no-invalid-schema-examples: off
  path-excludes-patterns: off
  path-http-verbs-order: off
  path-params-defined: off
  required-string-property-missing-min-length: off
  response-contains-header: off
  path-segment-plural: off
  scalar-property-missing-example: off
  no-required-schema-properties-undefined: off
  no-invalid-media-type-examples: warn
  no-server-example.com: warn
  no-server-trailing-slash: error
  no-empty-servers: warn
  no-example-value-and-externalValue: warn
  no-unused-components: warn
  no-undefined-server-variable: warn
  no-server-variables-empty-enum: error
  spec-components-invalid-map-name: warn
  boolean-parameter-prefixes: off
  component-name-unique: off
  operation-4xx-problem-details-rfc7807: off
  request-mime-type: off
  response-contains-property: off
  response-mime-type: off
  array-parameter-serialization: off
```

### Minimal ruleset: OpenAPI 3.0

```yaml
rules:
  info-contact: off
  info-license: off
  info-license-url: off
  info-license-strict: off
  tag-description: warn
  tags-alphabetical: off
  parameter-description: off
  no-path-trailing-slash: warn
  no-identical-paths: warn
  no-ambiguous-paths: warn
  path-declaration-must-exist: warn
  path-not-include-query: warn
  path-parameters-defined: warn
  operation-description: off
  operation-2xx-response: warn
  operation-4xx-response: off
  operation-operationId: warn
  operation-summary: warn
  operation-operationId-unique: warn
  operation-parameters-unique: warn
  operation-tag-defined: off
  security-defined: warn
  operation-operationId-url-safe: warn
  operation-singular-tag: off
  no-unresolved-refs: error
  no-enum-type-mismatch: warn
  paths-kebab-case: off
  struct: error
  spec-strict-refs: off
  no-http-verbs-in-paths: off
  no-invalid-parameter-examples: off
  no-invalid-schema-examples: off
  path-excludes-patterns: off
  path-http-verbs-order: off
  path-params-defined: off
  required-string-property-missing-min-length: off
  response-contains-header: off
  path-segment-plural: off
  scalar-property-missing-example: off
  no-required-schema-properties-undefined: off
  no-invalid-media-type-examples: warn
  no-server-example.com: warn
  no-server-trailing-slash: error
  no-empty-servers: warn
  no-example-value-and-externalValue: warn
  no-unused-components: warn
  no-undefined-server-variable: warn
  no-server-variables-empty-enum: error
  spec-components-invalid-map-name: warn
  boolean-parameter-prefixes: off
  component-name-unique: off
  operation-4xx-problem-details-rfc7807: off
  request-mime-type: off
  response-contains-property: off
  response-mime-type: off
  array-parameter-serialization: off
```

### Minimal ruleset: OpenAPI 2.0

```yaml
rules:
  info-contact: off
  info-license: off
  info-license-url: off
  info-license-strict: off
  tag-description: warn
  tags-alphabetical: off
  parameter-description: off
  no-path-trailing-slash: warn
  no-identical-paths: warn
  no-ambiguous-paths: warn
  path-declaration-must-exist: warn
  path-not-include-query: warn
  path-parameters-defined: warn
  operation-description: off
  operation-2xx-response: warn
  operation-4xx-response: off
  operation-operationId: warn
  operation-summary: warn
  operation-operationId-unique: warn
  operation-parameters-unique: warn
  operation-tag-defined: off
  security-defined: warn
  operation-operationId-url-safe: warn
  operation-singular-tag: off
  no-unresolved-refs: error
  no-enum-type-mismatch: warn
  paths-kebab-case: off
  struct: error
  spec-strict-refs: off
  no-http-verbs-in-paths: off
  no-invalid-parameter-examples: off
  no-invalid-schema-examples: off
  path-excludes-patterns: off
  path-http-verbs-order: off
  path-params-defined: off
  required-string-property-missing-min-length: off
  response-contains-header: off
  path-segment-plural: off
  scalar-property-missing-example: off
  no-required-schema-properties-undefined: off
  boolean-parameter-prefixes: off
  request-mime-type: off
  response-contains-property: off
  response-mime-type: off
```

### Minimal ruleset: AsyncAPI 3.0

```yaml
rules:
  struct: error
  info-contact: off
  info-license-strict: off
  operation-operationId: warn
  tag-description: warn
  tags-alphabetical: off
  channels-kebab-case: off
  no-channel-trailing-slash: off
```

### Minimal ruleset: AsyncAPI 2.6

```yaml
rules:
  struct: error
  info-contact: off
  info-license-strict: off
  operation-operationId: warn
  tag-description: warn
  tags-alphabetical: off
  channels-kebab-case: off
  no-channel-trailing-slash: off
```

### Minimal ruleset: Arazzo 1.0

```yaml
rules:
  struct: error
  sourceDescription-type: off
  workflowId-unique: error
  stepId-unique: error
  sourceDescription-name-unique: off
  workflow-dependsOn: off
  parameters-unique: off
  step-onSuccess-unique: off
  step-onFailure-unique: off
  respect-supported-versions: off
  requestBody-replacements-unique: off
  no-criteria-xpath: off
  no-actions-type-end: off
  criteria-unique: off
  no-x-security-scheme-name-without-openapi: off
  x-security-scheme-required-values: off
  no-x-security-scheme-name-in-workflow: off
```

## Recommended rulesets

The default behavior is to use a recommended ruleset.
The recommended rulesets for each format are listed below.
There is also a "recommended-strict" ruleset which is identical but with all `warn` settings changed to `error`.

### Recommended ruleset: OpenAPI 3.1

```yaml
rules:
  info-contact: off
  info-license: warn
  info-license-url: off
  info-license-strict: warn
  tag-description: warn
  tags-alphabetical: off
  parameter-description: off
  no-path-trailing-slash: error
  no-identical-paths: error
  no-ambiguous-paths: warn
  path-declaration-must-exist: error
  path-not-include-query: error
  path-parameters-defined: error
  operation-description: off
  operation-2xx-response: warn
  operation-4xx-response: warn
  operation-operationId: warn
  operation-summary: error
  operation-operationId-unique: error
  operation-operationId-url-safe: error
  operation-parameters-unique: error
  operation-tag-defined: off
  security-defined: error
  operation-singular-tag: off
  no-unresolved-refs: error
  no-enum-type-mismatch: error
  paths-kebab-case: off
  struct: error
  spec-strict-refs: off
  no-http-verbs-in-paths: off
  no-invalid-parameter-examples: off
  no-invalid-schema-examples: off
  path-excludes-patterns: off
  path-http-verbs-order: off
  path-params-defined: off
  path-segment-plural: off
  required-string-property-missing-min-length: off
  response-contains-header: off
  scalar-property-missing-example: off
  no-required-schema-properties-undefined: off
oas3_1Rules:
  info-contact: off
  info-license: warn
  info-license-url: off
  info-license-strict: warn
  tag-description: warn
  tags-alphabetical: off
  parameter-description: off
  no-path-trailing-slash: error
  no-identical-paths: error
  no-ambiguous-paths: warn
  path-declaration-must-exist: error
  path-not-include-query: error
  path-parameters-defined: error
  operation-description: off
  operation-2xx-response: warn
  operation-4xx-response: warn
  operation-operationId: warn
  operation-summary: error
  operation-operationId-unique: error
  operation-operationId-url-safe: error
  operation-parameters-unique: error
  operation-tag-defined: off
  security-defined: error
  operation-singular-tag: off
  no-unresolved-refs: error
  no-enum-type-mismatch: error
  paths-kebab-case: off
  struct: error
  spec-strict-refs: off
  no-http-verbs-in-paths: off
  no-invalid-parameter-examples: off
  no-invalid-schema-examples: off
  path-excludes-patterns: off
  path-http-verbs-order: off
  path-params-defined: off
  path-segment-plural: off
  required-string-property-missing-min-length: off
  response-contains-header: off
  scalar-property-missing-example: off
  no-required-schema-properties-undefined: off
  no-invalid-media-type-examples: warn
  no-server-example.com: warn
  no-server-trailing-slash: error
  no-empty-servers: error
  no-example-value-and-externalValue: error
  no-unused-components: warn
  no-undefined-server-variable: error
  no-server-variables-empty-enum: error
  spec-components-invalid-map-name: error
  boolean-parameter-prefixes: off
  component-name-unique: off
  operation-4xx-problem-details-rfc7807: off
  request-mime-type: off
  response-contains-property: off
  response-mime-type: off
  array-parameter-serialization: off
```

### Recommended ruleset: OpenAPI 3.0

```yaml
rules:
  info-contact: off
  info-license: warn
  info-license-url: off
  info-license-strict: warn
  tag-description: warn
  tags-alphabetical: off
  parameter-description: off
  no-path-trailing-slash: error
  no-identical-paths: error
  no-ambiguous-paths: warn
  path-declaration-must-exist: error
  path-not-include-query: error
  path-parameters-defined: error
  operation-description: off
  operation-2xx-response: warn
  operation-4xx-response: warn
  operation-operationId: warn
  operation-summary: error
  operation-operationId-unique: error
  operation-operationId-url-safe: error
  operation-parameters-unique: error
  operation-tag-defined: off
  security-defined: error
  operation-singular-tag: off
  no-unresolved-refs: error
  no-enum-type-mismatch: error
  paths-kebab-case: off
  struct: error
  spec-strict-refs: off
  no-http-verbs-in-paths: off
  no-invalid-parameter-examples: off
  no-invalid-schema-examples: off
  path-excludes-patterns: off
  path-http-verbs-order: off
  path-params-defined: off
  path-segment-plural: off
  required-string-property-missing-min-length: off
  response-contains-header: off
  scalar-property-missing-example: off
  no-required-schema-properties-undefined: off
  no-invalid-media-type-examples: warn
  no-server-example.com: warn
  no-server-trailing-slash: error
  no-empty-servers: error
  no-example-value-and-externalValue: error
  no-unused-components: warn
  no-undefined-server-variable: error
  no-server-variables-empty-enum: error
  spec-components-invalid-map-name: error
  boolean-parameter-prefixes: off
  component-name-unique: off
  operation-4xx-problem-details-rfc7807: off
  request-mime-type: off
  response-contains-property: off
  response-mime-type: off
  array-parameter-serialization: off
```

### Recommended ruleset: OpenAPI 2.0

```yaml
rules:
  info-contact: off
  info-license: warn
  info-license-url: off
  info-license-strict: warn
  tag-description: warn
  tags-alphabetical: off
  parameter-description: off
  no-path-trailing-slash: error
  no-identical-paths: error
  no-ambiguous-paths: warn
  path-declaration-must-exist: error
  path-not-include-query: error
  path-parameters-defined: error
  operation-description: off
  operation-2xx-response: warn
  operation-4xx-response: warn
  operation-operationId: warn
  operation-summary: error
  operation-operationId-unique: error
  operation-operationId-url-safe: error
  operation-parameters-unique: error
  operation-tag-defined: off
  security-defined: error
  operation-singular-tag: off
  no-unresolved-refs: error
  no-enum-type-mismatch: error
  paths-kebab-case: off
  struct: error
  spec-strict-refs: off
  no-http-verbs-in-paths: off
  no-invalid-parameter-examples: off
  no-invalid-schema-examples: off
  path-excludes-patterns: off
  path-http-verbs-order: off
  path-params-defined: off
  path-segment-plural: off
  required-string-property-missing-min-length: off
  response-contains-header: off
  scalar-property-missing-example: off
  no-required-schema-properties-undefined: off
  boolean-parameter-prefixes: off
  request-mime-type: off
  response-contains-property: off
  response-mime-type: off
```

### Recommended ruleset: AsyncAPI 3.0

```yaml
rules:
  struct: error
  info-contact: off
  info-license-strict: warn
  operation-operationId: warn
  tag-description: warn
  tags-alphabetical: off
  channels-kebab-case: off
  no-channel-trailing-slash: off
```

### Recommended ruleset: AsyncAPI 2.6

```yaml
rules:
  struct: error
  info-contact: off
  info-license-strict: warn
  operation-operationId: warn
  tag-description: warn
  tags-alphabetical: off
  channels-kebab-case: off
  no-channel-trailing-slash: off
```

### Recommended ruleset: Arazzo 1.0

```yaml
rules:
  struct: error
  sourceDescription-type: error
  workflowId-unique: error
  stepId-unique: error
  sourceDescription-name-unique: error
  workflow-dependsOn: error
  parameters-unique: error
  step-onSuccess-unique: warn
  step-onFailure-unique: warn
  respect-supported-versions: off
  requestBody-replacements-unique: warn
  no-criteria-xpath: off
  no-actions-type-end: warn
  criteria-unique: warn
  no-x-security-scheme-name-without-openapi: off
  x-security-scheme-required-values: off
  no-x-security-scheme-name-in-workflow: 'off',
```

## Resources

- Learn about [API governance](../api-standards.md).
- More information and examples for individual rules can be found in the [built-in rules documentation](./built-in-rules.md).
- Add your own [configurable rules](./configurable-rules.md) if there's anything you need that isn't already provided as a built in rule.
