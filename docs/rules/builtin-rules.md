---
redirectFrom:
  - /docs/cli/built-in-rules/
  - /docs/cli/resources/built-in-rules/
---

# Built in rules

The built-in rules are the ones we use ourselves and think apply to the majority of APIs. Some have some additional [configuration](#rule-configuration-syntax), but otherwise all you need to do is decide whether each rule should `error`, `warn` or be `off`.

All the built-in rules are listed here, roughly grouped by the OpenAPI object they apply to.
The *Special rules* group contains rules that may apply to multiple objects or to the entire OpenAPI document.

:::info
Build [configurable rules](./rules/configurable-rules.md) if the rule you need isn't listed.
:::

### Special rules

- [no-unresolved-refs](./rules/no-unresolved-refs.md): Every `$ref` must exist
- [no-unused-components](./rules/no-unused-components.md): All components must be used
- [security-defined](./rules/security-defined.md): Security rules must be defined, either globally or per-operation
- [spec](./rules/spec.md): Conform to the declared OpenAPI specification version
- [spec-components-invalid-map-name](./rules/spec-components-invalid-map-name.md): Use only alphanumeric and basic punctuation as key names in the components section

### Info

- [info-contact](./rules/info-contact.md): Contact section is defined under `info`
- [info-license](./rules/info-license.md): License section is defined under `info`
- [info-license-url](./rules/info-license-url.md): License section contains a `url` to the license

### Operations

- [operation-2xx-response](./rules/operation-2xx-response.md): Every operation needs at least one 2xx response
- [operation-4xx-response](./rules/operation-4xx-response.md): Every operation needs at least one 4xx response
- [operation-4xx-problem-details-rfc7807](./rules/operation-4xx-problem-details-rfc7807.md): All 4xx responses use RFC7807 format
- [operation-description](./rules/operation-description.md): Description field is required for every operation
- [operation-operationId](./rules/operation-operationId.md): OperationId is required for every operation
- [operation-operationId-unique](./rules/operation-operationId-unique.md): OperationId must be unique
- [operation-operationId-url-safe](./rules/operation-operationId-url-safe.md): OperationIds can only contain characters that are safe to use in URLs
- [operation-summary](./rules/operation-summary.md): Summary is required for every operation

### Parameters

- [boolean-parameter-prefixes](./rules/boolean-parameter-prefixes.md): All boolean paramater names start with a particular prefix (such as "is")
- [no-invalid-parameter-examples](./rules/no-invalid-parameter-examples.md): Parameter examples must match declared schema types
- [operation-parameters-unique](./rules/operation-parameters-unique.md): No repeated parameter names within an operation
- [parameter-description](./rules/parameter-description.md): Parameters must all have descriptions
- [path-declaration-must-exist](./rules/path-declaration-must-exist.md): Paths must define template variables where placeholders are needed
- [path-not-include-query](./rules/path-not-include-query.md): No query parameters in path declarations (declare them as parameters with `in: query`)
- [path-parameters-defined](./rules/path-parameters-defined.md): Path template variables must be defined as parameters

### Paths

- [no-ambiguous-paths](./rules/no-ambiguous-paths.md): No path can match more than one PathItem entry, including template variables
- [no-http-verbs-in-paths](./rules/no-http-verbs-in-paths.md): Verbs like "get" cannot be used in paths
- [no-identical-paths](./rules/no-identical-paths.md): Paths cannot be identical, including template variables
- [no-path-trailing-slash](./rules/no-path-trailing-slash.md): No trailing slashes on paths
- [path-excludes-patterns](./rules/path-excludes-patterns.md): Set a regular expression that cannot be used in paths
- [path-segment-plural](./rules/path-segment-plural.md): All URL segments in a path must be plural (exceptions can be configured)
- [paths-kebab-case](./rules/paths-kebab-case.md): Paths must be in `kebab-case` format

### Requests, Responses, and Schemas

- [no-enum-type-mismatch](./rules/no-enum-type-mismatch.md): Enum options must match the data type declared in the schema
- [no-example-value-and-externalValue](./rules/no-example-value-and-externalValue.md): Either the `value` or `externalValue` may be present, but not both
- [no-invalid-media-type-examples](./rules/no-invalid-media-type-examples.md): Example request bodies must match the declared schema
- [no-invalid-schema-examples](./rules/no-invalid-schema-examples.md): Schema examples must match declared types
- [request-mime-type](./rules/request-mime-type.md): Configure allowed mime types for requests
- [response-mime-type](./rules/response-mime-type.md): Configure allowed mime types for responses
- [response-contains-header](./rules/response-contains-header.md): List headers that must be included with specific response types
- [response-contains-property](./rules/response-contains-property.md): Specify properties that should be present in specific response types
- [scalar-property-missing-example](./rules/scalar-property-missing-example.md): All required scalar (non-object) properties must have examples defined
- [required-string-property-missing-min-length](./rules/required-string-property-missing-min-length.md): All required properties of type string must have a `minLength` configured

### Servers

- [no-empty-servers](./rules/no-empty-servers.md): Servers array must be defined
- [no-server-example.com](./rules/no-server-example-com.md): `example.com` is not acceptable as a server URL
- [no-server-trailing-slash](./rules/no-server-trailing-slash.md): Server URLs cannot end with a slash (paths usually start with a slash)
- [no-server-variables-empty-enum](./rules/no-server-variables-empty-enum.md): Require that enum values are set if variables are used in server definition
- [no-undefined-server-variable](./rules/no-undefined-server-variable.md): All variables in server definition must be defined

### Tags

- [operation-singular-tag](./rules/operation-singular-tag.md): Each operation may only have one tag
- [operation-tag-defined](./rules/operation-tag-defined.md): Tags can only be used if they are defined at the top level
- [tag-description](./rules/tag-description.md): Tags must have descriptions
- [tags-alphabetical](./rules/tags-alphabetical.md): Tags in the top-level `tags` section must appear alphabetically


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

* Learn more about [linting rules](../rules.md), or follow the [guide to configuring a ruleset](../guides/configure-rules.md).
* If you didn't find the rule you need, build a [configurable rule](./rules/configurable-rules.md) for a perfect linting fit.

