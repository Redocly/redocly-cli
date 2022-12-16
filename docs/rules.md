---
title: Rules
redirectFrom:
  - /docs/cli/built-in-rules/
  - /docs/cli/resources/built-in-rules/
---

# Rules

All Redocly CLI rules are listed on this page.

To learn how to configure rules, read more about their [configuration syntax](#rule-configuration-syntax).

Rules are roughly grouped by the OpenAPI object they apply to.
The *Special rules* group contains rules that may apply to multiple objects or to the entire OpenAPI document.

### Special rules

- [custom rules](./rules/custom-rules.md)
- [no-unresolved-refs](./rules/no-unresolved-refs.md)
- [no-unused-components](./rules/no-unused-components.md)
- [security-defined](./rules/security-defined.md)
- [spec](./rules/spec.md)
- [spec-components-invalid-map-name](./rules/spec-components-invalid-map-name.md)

### Info

- [info-contact](./rules/info-contact.md)
- [info-license](./rules/info-license.md)
- [info-license-url](./rules/info-license-url.md)

### Operations

- [operation-2xx-response](./rules/operation-2xx-response.md)
- [operation-4xx-response](./rules/operation-4xx-response.md)
- [operation-4xx-problem-details-rfc7807](./rules/operation-4xx-problem-details-rfc7807.md)
- [operation-description](./rules/operation-description.md)
- [operation-operationId](./rules/operation-operationId.md)
- [operation-operationId-unique](./rules/operation-operationId-unique.md)
- [operation-operationId-url-safe](./rules/operation-operationId-url-safe.md)
- [operation-summary](./rules/operation-summary.md)

### Parameters

- [boolean-parameter-prefixes](./rules/boolean-parameter-prefixes.md)
- [no-invalid-parameter-examples](./rules/no-invalid-parameter-examples.md)
- [operation-parameters-unique](./rules/operation-parameters-unique.md)
- [parameter-description](./rules/parameter-description.md)
- [path-declaration-must-exist](./rules/path-declaration-must-exist.md)
- [path-not-include-query](./rules/path-not-include-query.md)
- [path-parameters-defined](./rules/path-parameters-defined.md)

### Paths

- [no-ambiguous-paths](./rules/no-ambiguous-paths.md)
- [no-http-verbs-in-paths](./rules/no-http-verbs-in-paths.md)
- [no-identical-paths](./rules/no-identical-paths.md)
- [no-path-trailing-slash](./rules/no-path-trailing-slash.md)
- [path-excludes-patterns](./rules/path-excludes-patterns.md)
- [path-segment-plural](./rules/path-segment-plural.md)
- [paths-kebab-case](./rules/paths-kebab-case.md)

### Requests, Responses, and Schemas

- [no-enum-type-mismatch](./rules/no-enum-type-mismatch.md)
- [no-example-value-and-externalValue](./rules/no-example-value-and-externalValue.md)
- [no-invalid-media-type-examples](./rules/no-invalid-media-type-examples.md)
- [no-invalid-schema-examples](./rules/no-invalid-schema-examples.md)
- [request-mime-type](./rules/request-mime-type.md)
- [response-mime-type](./rules/response-mime-type.md)
- [response-contains-header](./rules/response-contains-header.md)
- [response-contains-property](./rules/response-contains-property.md)
- [scalar-property-missing-example](./rules/scalar-property-missing-example.md)

### Servers

- [no-empty-servers](./rules/no-empty-servers.md)
- [no-server-example.com](./rules/no-server-example-com.md)
- [no-server-trailing-slash](./rules/no-server-trailing-slash.md)
- [no-server-variables-empty-enum](./rules/no-server-variables-empty-enum.md)
- [no-undefined-server-variable](./rules/no-undefined-server-variable.md)

### Tags

- [operation-singular-tag](./rules/operation-singular-tag.md)
- [operation-tag-defined](./rules/operation-tag-defined.md)
- [tag-description](./rules/tag-description.md)
- [tags-alphabetical](./rules/tags-alphabetical.md)


## Rule configuration syntax

To change your settings for any given rule, add or modify its corresponding entry in your Redocly configuration file.

You can specify global settings in the top-level `lint` and `rules` object, or use per-API settings by adding a `lint` and `rules` object under each API in `apis`.

You can format each entry in the `lint` and `rules` object in one of the following ways:

- Short syntax with single-line configuration `rule-name: {severity}`, where `{severity}` is one of `error`, `warn` or `off`. You can't configure additional rule options with this syntax.

```yaml
apis:
  main:
    root: ./openapi/openapi.yaml
    rules:
      specific-api-rule: warn
rules:
  example-rule-name: error
```

- Verbose syntax, where you can configure additional options for rules that support them.

```yaml
apis:
  main:
    root: ./openapi/openapi.yaml
    rules:
      specific-api-rule:
        severity: warn
rules:
  example-rule-name:
    severity: error
    rule-option-one: value
    rule-option-two: value
```

### Severity settings

Severity settings determine how the rule is treated during the validation process.

- `severity: error` - if the rule is triggered, the output displays an error message and the API definition doesn't pass validation.
- `severity: warn` - if the rule is triggered, the output displays a warning message. Your API definition may still be valid if no other errors are detected.
- `severity: off` - disables the rule altogether. The rule is skipped during validation.

## Recommended config


There are two built-in configurations:

- minimal
- recommended

The recommended configuration can be enabled by adding

```yaml
extends:
  - recommended
```

to the Redocly configuration file.

You may then override the severity for any specific rule in the `rules` object.

Here is the equivalent of the `recommended` configuration values:

```yaml
    info-license: warn
    info-license-url: warn
    tag-description: warn
    no-path-trailing-slash: error
    no-ambiguous-paths: warn
    path-declaration-must-exist: error
    path-not-include-query: error
    path-parameters-defined: error
    operation-2xx-response: warn
    operation-4xx-response: warn
    operation-operationId: warn
    operation-summary: error
    operation-operationId-unique: error
    operation-operationId-url-safe: error
    operation-parameters-unique: error
    security-defined: error
    no-unresolved-refs: error
    no-enum-type-mismatch: error
    spec: error
    no-invalid-media-type-examples:
      severity: warn
      disallowAdditionalProperties: true
    no-server-example.com: warn
    no-server-trailing-slash: error
    no-empty-servers: error
    no-example-value-and-externalValue: error
    no-unused-components: warn
    no-undefined-server-variable: error
```

## Rule ideas

Redocly CLI supports [custom rules](./rules/custom-rules.md) and [custom plugins](./resources/custom-plugins.md).
However, if you have an idea for a built-in rule you believe will benefit the greater API community, please [open an issue](https://github.com/Redocly/redocly-cli/issues/new) in the Redocly CLI repository.
