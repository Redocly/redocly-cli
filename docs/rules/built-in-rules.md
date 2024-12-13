---
slug: /docs/cli/rules/built-in-rules
---

# Built-in rules

The built-in rules are the ones we use ourselves and think apply to the majority of APIs. Some have some additional [configuration](#rule-configuration-syntax), but otherwise all you need to do is decide whether each rule should `error`, `warn` or be `off`.

All the built-in rules are listed here, roughly grouped by the OpenAPI object they apply to.
The _Special rules_ group contains rules that may apply to multiple objects or to the entire OpenAPI document.

{% admonition type="info" %}
Build [configurable rules](./configurable-rules.md) if the rule you need isn't listed.
{% /admonition %}

## List of available rules

Details of all the rules available "out of the box" with Redocly CLI are listed below. Visit each individual page for details of what the rule does, additional configuration options, and examples of it in use.

### Special rules

- [no-unresolved-refs](./oas/no-unresolved-refs.md): Every `$ref` must exist
- [no-unused-components](./oas/no-unused-components.md): All components must be used
- [security-defined](./oas/security-defined.md): Security rules must be defined, either globally or per-operation
- [struct](./oas/struct.md): Conform to the declared OpenAPI specification version
- [spec-components-invalid-map-name](./oas/spec-components-invalid-map-name.md): Use only alphanumeric and basic punctuation as key names in the components section
- [spec-strict-refs](./oas/spec-strict-refs.md) Restricts the usage of the `$ref` keyword.

### Info

- [info-contact](./oas/info-contact.md): Contact section is defined under `info`
- [info-license](./oas/info-license.md): License section is defined under `info`
- [info-license-url](./oas/info-license-url.md): License section contains a `url` to the license

### Operations

- [operation-2xx-response](./oas/operation-2xx-response.md): Every operation needs at least one 2xx response
- [operation-4xx-response](./oas/operation-4xx-response.md): Every operation needs at least one 4xx response
- [operation-4xx-problem-details-rfc7807](./oas/operation-4xx-problem-details-rfc7807.md): All 4xx responses use RFC7807 format
- [operation-description](./oas/operation-description.md): Description field is required for every operation
- [operation-operationId](./oas/operation-operationId.md): OperationId is required for every operation
- [operation-operationId-unique](./oas/operation-operationId-unique.md): OperationId must be unique
- [operation-operationId-url-safe](./oas/operation-operationId-url-safe.md): OperationIds can only contain characters that are safe to use in URLs
- [operation-summary](./oas/operation-summary.md): Summary is required for every operation

### Parameters

- [boolean-parameter-prefixes](./oas/boolean-parameter-prefixes.md): All boolean paramater names start with a particular prefix (such as "is")
- [no-invalid-parameter-examples](./oas/no-invalid-parameter-examples.md): Parameter examples must match declared schema types
- [operation-parameters-unique](./oas/operation-parameters-unique.md): No repeated parameter names within an operation
- [parameter-description](./oas/parameter-description.md): Parameters must all have descriptions
- [path-declaration-must-exist](./oas/path-declaration-must-exist.md): Paths must define template variables where placeholders are needed
- [path-not-include-query](./oas/path-not-include-query.md): No query parameters in path declarations (declare them as parameters with `in: query`)
- [path-parameters-defined](./oas/path-parameters-defined.md): Path template variables must be defined as parameters

### Paths

- [no-ambiguous-paths](./oas/no-ambiguous-paths.md): No path can match more than one PathItem entry, including template variables
- [no-http-verbs-in-paths](./oas/no-http-verbs-in-paths.md): Verbs like "get" cannot be used in paths
- [no-identical-paths](./oas/no-identical-paths.md): Paths cannot be identical, including template variables
- [no-path-trailing-slash](./oas/no-path-trailing-slash.md): No trailing slashes on paths
- [path-excludes-patterns](./oas/path-excludes-patterns.md): Set a regular expression that cannot be used in paths
- [path-segment-plural](./oas/path-segment-plural.md): All URL segments in a path must be plural (exceptions can be configured)
- [paths-kebab-case](./oas/paths-kebab-case.md): Paths must be in `kebab-case` format

### Requests, Responses, and Schemas

- [no-enum-type-mismatch](./oas/no-enum-type-mismatch.md): Enum options must match the data type declared in the schema
- [no-example-value-and-externalValue](./oas/no-example-value-and-externalValue.md): Either the `value` or `externalValue` may be present, but not both
- [no-invalid-media-type-examples](./oas/no-invalid-media-type-examples.md): Example request bodies must match the declared schema
- [no-invalid-schema-examples](./oas/no-invalid-schema-examples.md): Schema examples must match declared types
- [request-mime-type](./oas/request-mime-type.md): Configure allowed mime types for requests
- [response-mime-type](./oas/response-mime-type.md): Configure allowed mime types for responses
- [response-contains-header](./oas/response-contains-header.md): List headers that must be included with specific response types
- [response-contains-property](./oas/response-contains-property.md): Specify properties that should be present in specific response types
- [scalar-property-missing-example](./oas/scalar-property-missing-example.md): All required scalar (non-object) properties must have examples defined
- [required-string-property-missing-min-length](./oas/required-string-property-missing-min-length.md): All required properties of type string must have a `minLength` configured

### Servers

- [no-empty-servers](./oas/no-empty-servers.md): Servers array must be defined
- [no-server-example.com](./oas/no-server-example-com.md): `example.com` is not acceptable as a server URL
- [no-server-trailing-slash](./oas/no-server-trailing-slash.md): Server URLs cannot end with a slash (paths usually start with a slash)
- [no-server-variables-empty-enum](./oas/no-server-variables-empty-enum.md): Require that enum values are set if variables are used in server definition
- [no-undefined-server-variable](./oas/no-undefined-server-variable.md): All variables in server definition must be defined

### Tags

- [operation-singular-tag](./oas/operation-singular-tag.md): Each operation may only have one tag
- [operation-tag-defined](./oas/operation-tag-defined.md): Tags can only be used if they are defined at the top level
- [tag-description](./oas/tag-description.md): Tags must have descriptions
- [tags-alphabetical](./oas/tags-alphabetical.md): Tags in the top-level `tags` section must appear alphabetically

## Rule configuration syntax

To change your settings for any given rule, add or modify its corresponding entry in your Redocly configuration file.

You can specify global settings in the top-level `rules` object, or use per-API settings by adding a `rules` object under each API in `apis`.

You can format each entry in the `rules` object in one of the following ways:

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

## Next steps

- Learn more about [API linting](../api-standards.md), or follow the [guide to configuring a ruleset](../guides/configure-rules.md).
- If you didn't find the rule you need, build a [configurable rule](./configurable-rules.md) for a perfect linting fit.
