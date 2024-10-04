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

## Rules for each API description format

Redocly CLI can lint multiple API description formats:

- [OpenAPI](#openapi-rules)
- [AsyncAPI](#asyncapi-rules)
- [Arazzo](#arazzo-rules)

Visit each page for details of what the rule does, additional configuration options, and examples of it in use.

## OpenAPI rules

The rules list is split into sections.

### Special rules

- [no-unresolved-refs](./no-unresolved-refs.md): Every `$ref` must exist
- [no-unused-components](./no-unused-components.md): All components must be used
- [security-defined](./security-defined.md): Security rules must be defined, either globally or per-operation
- [spec](./spec.md): Conform to the declared OpenAPI specification version
- [spec-components-invalid-map-name](./spec-components-invalid-map-name.md): Use only alphanumeric and basic punctuation as key names in the components section
- [spec-strict-refs](./spec-strict-refs.md) Restricts the usage of the `$ref` keyword.

### Info

- [info-contact](./info-contact.md): Contact section is defined under `info`
- [info-license](./info-license.md): License section is defined under `info`
- [info-license-url](./info-license-url.md): License section contains a `url` to the license

### Operations

- [operation-2xx-response](./operation-2xx-response.md): Every operation needs at least one 2xx response
- [operation-4xx-response](./operation-4xx-response.md): Every operation needs at least one 4xx response
- [operation-4xx-problem-details-rfc7807](./operation-4xx-problem-details-rfc7807.md): All 4xx responses use RFC7807 format
- [operation-description](./operation-description.md): Description field is required for every operation
- [operation-operationId](./operation-operationId.md): OperationId is required for every operation
- [operation-operationId-unique](./operation-operationId-unique.md): OperationId must be unique
- [operation-operationId-url-safe](./operation-operationId-url-safe.md): OperationIds can only contain characters that are safe to use in URLs
- [operation-summary](./operation-summary.md): Summary is required for every operation

### Parameters

- [boolean-parameter-prefixes](./boolean-parameter-prefixes.md): All boolean paramater names start with a particular prefix (such as "is")
- [no-invalid-parameter-examples](./no-invalid-parameter-examples.md): Parameter examples must match declared schema types
- [operation-parameters-unique](./operation-parameters-unique.md): No repeated parameter names within an operation
- [parameter-description](./parameter-description.md): Parameters must all have descriptions
- [path-declaration-must-exist](./path-declaration-must-exist.md): Paths must define template variables where placeholders are needed
- [path-not-include-query](./path-not-include-query.md): No query parameters in path declarations (declare them as parameters with `in: query`)
- [path-parameters-defined](./path-parameters-defined.md): Path template variables must be defined as parameters

### Paths

- [no-ambiguous-paths](./no-ambiguous-paths.md): No path can match more than one PathItem entry, including template variables
- [no-http-verbs-in-paths](./no-http-verbs-in-paths.md): Verbs like "get" cannot be used in paths
- [no-identical-paths](./no-identical-paths.md): Paths cannot be identical, including template variables
- [no-path-trailing-slash](./no-path-trailing-slash.md): No trailing slashes on paths
- [path-excludes-patterns](./path-excludes-patterns.md): Set a regular expression that cannot be used in paths
- [path-segment-plural](./path-segment-plural.md): All URL segments in a path must be plural (exceptions can be configured)
- [paths-kebab-case](./paths-kebab-case.md): Paths must be in `kebab-case` format

### Requests, Responses, and Schemas

- [no-enum-type-mismatch](./no-enum-type-mismatch.md): Enum options must match the data type declared in the schema
- [no-example-value-and-externalValue](./no-example-value-and-externalValue.md): Either the `value` or `externalValue` may be present, but not both
- [no-invalid-media-type-examples](./no-invalid-media-type-examples.md): Example request bodies must match the declared schema
- [no-invalid-schema-examples](./no-invalid-schema-examples.md): Schema examples must match declared types
- [request-mime-type](./request-mime-type.md): Configure allowed mime types for requests
- [response-mime-type](./response-mime-type.md): Configure allowed mime types for responses
- [response-contains-header](./response-contains-header.md): List headers that must be included with specific response types
- [response-contains-property](./response-contains-property.md): Specify properties that should be present in specific response types
- [scalar-property-missing-example](./scalar-property-missing-example.md): All required scalar (non-object) properties must have examples defined
- [required-string-property-missing-min-length](./required-string-property-missing-min-length.md): All required properties of type string must have a `minLength` configured

### Servers

- [no-empty-servers](./no-empty-servers.md): Servers array must be defined
- [no-server-example.com](./no-server-example-com.md): `example.com` is not acceptable as a server URL
- [no-server-trailing-slash](./no-server-trailing-slash.md): Server URLs cannot end with a slash (paths usually start with a slash)
- [no-server-variables-empty-enum](./no-server-variables-empty-enum.md): Require that enum values are set if variables are used in server definition
- [no-undefined-server-variable](./no-undefined-server-variable.md): All variables in server definition must be defined

### Tags

- [operation-singular-tag](./operation-singular-tag.md): Each operation may only have one tag
- [operation-tag-defined](./operation-tag-defined.md): Tags can only be used if they are defined at the top level
- [tag-description](./tag-description.md): Tags must have descriptions
- [tags-alphabetical](./tags-alphabetical.md): Tags in the top-level `tags` section must appear alphabetically

## AsyncAPI rules

- [no-channel-trailing-slash](./async/no-channel-trailing-slash.md)
- [channels-kebab-case](./async/channels-kebab-case.md)

## Arazzo rules

Within the Arazzo family of rules, there are rules for the main Arazzo specification format, and some additional rules for extensions supported by Spot, the Redocly testing utility.

### Arazzo

- [parameters-unique](./arazzo/parameters-unique.md)
- [step-onSuccess-unique](./arazzo/step-onSuccess-unique.md)
- [workflow-dependsOn](./arazzo/workflow-dependsOn.md)
- [sourceDescriptions-type](./arazzo/sourceDescriptions-type.md)
- [step-onFailure-unique](./arazzo/step-onFailure-unique.md)
- [sourceDescriptions-name-unique](./arazzo/sourceDescriptions-name-unique.md)
- [stepId-unique](./arazzo/stepId-unique.md)
- [criteria-unique](./arazzo/criteria-unique.md)
- [requestBody-replacements-unique](./arazzo/requestBody-replacements-unique.md)
- [workflowId-unique](./arazzo/workflowId-unique.md)

### Spot

- [no-criteria-xpath](./spot/no-criteria-xpath.md)
- [parameters-not-in-body](./spot/parameters-not-in-body.md)
- [version-enum](./spot/version-enum.md)
- [no-actions-type-end](./spot/no-actions-type-end.test.md)



## Configure rules in `redocly.yaml`

To change your settings for any given rule, add or modify its corresponding entry in your Redocly configuration file.

The following example shows rules configured in `redocly.yaml` with short syntax using the format `rule-name: {severity}`, where `{severity}` is one of `error`, `warn` or `off`:

```yaml
rules:
  operation-operationId: warn
  
```

Some rules support additional configuration options. The following example shows the more verbose format where the `severity` setting is added alongside other settings:

```yaml
rules:
  path-excludes-patterns: 
    severity: error
    patterns:
      - ^\/fetch
      - ^\/v[0-9]
```

Check the documentation for each rule to see if it supports additional configuration.

### Per-API configuration

You can set different rules for different APIs by adding a `rules` object under each API in `apis`.

```yaml
rules:
  operation-operationId: error

apis:
  museum:
    root: ./apis/museum.yaml
    rules:
      info-license: warn
  tickets@beta:
    root: ./apis/tickets.yaml
    rules:
      info-license: error
      operation-operationId-url-safe: error
      operation-operationId-unique: error

```

Each API picks up the settings that relate to it and gets linted accordingly.

### Per-format configuration

To configure rules that are different for different API formats or versions of API formats, you can use the format/version-specific configuration keys as shown in the table below:

| Configuration | Use for |
|-------|-------|
| `oas2Rules` | OpenAPI 2.x |
| `oas3_0Rules` | OpenAPI 3.0 |
| `oas3_1Rules` | OpenAPI 3.1 |
| `async2Rules` | AsyncAPI 2.6 |
| `async3Rules` | AsyncAPI 3.0 |
| `arazzoRules` | Arazzo 1.0 |

Using this approach is useful where you have different requirements for the different types of API description, but not necessarily every API. For example, you might choose to enable a very minimal set of rules for all formats, and add some additional restrictions for the OpenAPI 3.1 descriptions since those are expected to meet a higher standard.

The following configuration file shows an example of a minimal ruleset configuration, with some rules adjusted (both increased in severity and disabled) for different OpenAPI description formats:

```yaml
extends:
 - minimal

rules:
  info-description: warn

oas2Rules:
  no-unresolved-refs: off

oas3_1Rules:
  info-license: error
  no-ambiguous-paths: error
  operation-operationId-unique: error
```

Use these settings alongside `rules` configuration to tune the linting for each API description format.

## Resources

- Learn more about [API linting](../api-standards.md), or follow the [guide to configuring a ruleset](../guides/configure-rules.md).
- Visit the [documentation on per-API configuration](../configuration/apis.md)
- If you didn't find the rule you need, build a [configurable rule](./configurable-rules.md) for a perfect linting fit.
