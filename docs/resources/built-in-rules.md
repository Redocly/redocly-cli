---
title: Built-in rules in Redocly CLI
redirectFrom:
  - /docs/cli/built-in-rules/
---

# Built-in rules

All of our built-in Redocly CLI rules are listed on this page.
We don't ship any built-in preprocessors.

To change your settings for any given rule, add or modify its corresponding entry in the `lint.rules` section of the Redocly configuration file in your working directory.

You can specify global settings in the top-level `lint.rules` section, or use per-API settings by adding a `lint.rules` section under each API in `apis`.

You can format each entry in the `lint.rules` section in one of the following ways:

- Short syntax with single-line configuration `rule-name: {severity}`, where `{severity}` is one of `error`, `warn` or `off`. You can't configure additional rule options with this syntax.

```yaml
apis:
  main:
    root: ./openapi/openapi.yaml
    lint:
      rules:
        specific-api-rule: warn
lint:
  rules:
    example-rule-name: error
```

- Verbose syntax, where you can configure additional options for rules that support them.

```yaml
apis:
  main:
    root: ./openapi/openapi.yaml
    lint:
      rules:
        specific-api-rule:
          severity: warn
lint:
  rules:
    example-rule-name:
      severity: error
      rule-option-one: value
      rule-option-two: value
```

Severity settings determine how the rule is treated during the validation process.

- `severity: error` - if the rule is triggered, the output displays an error message and the API definition doesn't pass validation.
- `severity: warn` - if the rule is triggered, the output displays a warning message. Your API definition may still be valid if no other errors are detected.
- `severity: off` - disables the rule altogether. The rule is skipped during validation.


## List of built-in rules

### assertions

Configure assertions to enforce your API design standards without coding custom rules.
Learn how to [configure assertions](./rules/assertions.md).

### boolean-parameter-prefixes

`name` fields of parameters with type `boolean` should have a `is` or `has` prefix.
You can specify different prefixes.

```yaml
lint:
  boolean-parameter-prefixes:
    severity: {severity}
    prefixes: ["can", "is"]
```

### info-contact

Verifies the info contact object is present and correctly structured.

### info-license

Verifies the license is declared.

### info-license-url

Verifies the license URL is declared.

### no-ambiguous-paths

Verifies that paths are not ambiguous as defined in the spec:

> Assuming the following paths, the concrete definition, `/pets/mine`, will be matched first if used:
> ```
>   /pets/{petId}
>   /pets/mine
> ```
> The following paths are considered identical and invalid:
> ```
>   /pets/{petId}
>   /pets/{name}
> ```
> The following may lead to ambiguous resolution:
> ```
>   /{entity}/me
>   /books/{id}
> ```

### no-empty-servers

Empty `servers` defaults to `localhost`.
This rule verifies the servers have been defined.

### no-enum-type-mismatch

Enum values should respect the type specifier.

### no-example-value-and-externalValue

Examples for `requestBody` or response examples can have an `externalValue` or a `value`, but they cannot have both.

### no-http-verbs-in-paths

Prevent HTTP verbs in paths like `GET /getAllCustomers`.
Configure `splitIntoWords` to split path into words using casing before matching:

```yaml
lint:
  no-http-verbs-in-paths:
    severity: {severity}
    splitIntoWords: true
```

### no-identical-paths

Verifies that paths are not identical, including templated paths.

For example, these paths are identical because only the parameter name changed.

```
/pets/{id}
/pets/{hash}
```

### no-invalid-media-type-examples

Verifies media type examples comply with the defined schema. Disallows additional properties by default.
Adjust that behavior in configuration:

```yaml
lint:
  rules:
    no-invalid-media-type-examples:
      severity: warn
      disallowAdditionalProperties: false
```

### no-invalid-parameter-examples

Verifies that parameter example value conforms to the schema. Disallows additional properties by default.

```yaml
lint:
  no-invalid-parameter-examples:
    severity: error
    disallowAdditionalProperties: false
```

### no-invalid-schema-examples

Verifies that schema example value conforms to the schema. Disallows additional properties by default.

```yaml
lint:
  no-invalid-schema-examples:
    severity: error
    disallowAdditionalProperties: false
```

### no-path-trailing-slash

Verifies that paths do not end with a trailing slash.

Some web tooling (like mock servers, real servers, code generators, application frameworks, etc.) will treat `example.com/foo` and `example.com/foo/` as the same thing, but other tooling will not. Enable this rule to avoid confusion in your documentation.

### no-server-example.com

Server URL should not point to example.com.

### no-server-trailing-slash

Server URL should not have a trailing slash.

Some tooling forgets to strip trailing slashes off the `servers.url` is joined with paths, and you can get awkward URLs like `https://example.com/api//pets`. This rule helps prevent such issues.

### no-unresolved-refs

Resolves all refs.

### no-unused-components

Verifies there are no unused components.
Note: it does not verify there aren't any unused files.

### operation-2xx-response

Operation must have at least one `2xx` response.
Any API operation (endpoint) can fail but presumably it is also meant to do something constructive at some point.
If you forget to write out a success case for this API, then this rule will let you know.

### operation-4xx-response

Operation must have at least one `4xx` response.

Any API may return an error. Verifies that every API operation has at least one error case described.

### operation-description

Verifies each operation has a description.

### operation-operationId

Every operation must have an `operationId` defined.
Useful in the docs for deep-linking.
Useful elsewhere by having a common ID to refer to any operation.

### operation-operationId-unique

Every operation must have a unique `operationId`.

Why? A lot of documentation systems use this as an identifier and some SDK generators convert them to a method name. Enforcing this rule helps prevent issues in those and many other similar cases.

### operation-operationId-url-safe

Seeing as `operationId` is often used for unique URLs in documentation systems, it's a good idea to avoid non-URL safe characters.

### operation-parameters-unique

Verifies parameters are unique for any given operation.

### operation-security-defined

Operation `security` values must match a scheme defined in the `components.securitySchemes` object.

### operation-singular-tag

Use just one tag for an operation. Helpful for some documentation systems that use tags to avoid duplicate content.

### operation-summary

Verifies each operation has a summary.
Operation summaries are used to generate API docs.

### operation-tag-defined

Operation tags should be defined in global tags.

### parameter-description

Verifies that each parameter has a description.

### path-declaration-must-exist

Path parameter declarations cannot be empty, e.g. `/given/{}`is invalid.

### path-excludes-patterns

Disallow specific regular expressions to match against paths.

```yaml
lint:
  path-excludes-patterns:
    severity: error
    patterns:
      - ^\/[a-z]
```

### path-not-include-query

Don't put query string items in the path, they belong in parameters with `in: query`.

### path-parameters-defined

Verifies the path parameters are defined.

### path-segment-plural

All path segments should be plural. You can skip last segment or add exceptions using configuration:

```yaml
lint:
  boolean-parameter-prefixes:
    severity: {severity}
    ignoreLastPathSegment: true
    exceptions:
      - v1
```

### paths-kebab-case

All path items should be in kebab-case.

### request-mime-type

Limit the allowed request body mime types. The rule inverses behavior for webhooks and events: it enforces responses mime types.

```yaml
lint:
  request-mime-type:
    severity: error
    allowedValues:
      - application/json
```

### response-mime-type

Limit the allowed response mime types. The rule inverses behavior for webhooks and events: it enforces requests mime types.

```yaml
lint:
  response-mime-type:
    severity: error
    allowedValues:
      - application/json
```

### spec

Validate against the declared OpenAPI specification (currently supports version 2.0, 3.0, and 3.1).

### tag-description

Verifies that each tag has a description.

### tags-alphabetical

Verifies that tags (names) are declared in alphabetical order.

### response-contains-header

Enforces using specified response headers.

```yaml
lint:
  rules:
    response-contains-header:
      severity: error
      names:
        2XX: 
          - x-request-id
        400:
          - Content-Length
```

### response-contains-property

Enforces definition of specific response properties based on HTTP status code or HTTP status code range.
Priority is given to more precise status codes over the status code range.
```yaml
response-contains-header:
  severity: error
  names:
    2XX:
      - created_at
    400:
      - title
```


### scalar-property-missing-example

Verifies that every scalar property has an example defined.

## Recommended config

There are three built-in configurations:

- minimal
- recommended
- all

The recommended configuration can be enabled by adding

```yaml
lint:
  extends:
    - recommended
```

to the Redocly configuration file (and it is enabled by default).

You may then override the severity for any specific rule in the `lint.rules` section.

Here is the equivalent of the `recommended` configuration values:

```yaml
    info-description: warn
    info-contact: off
    info-license: warn
    info-license-url: warn
    tag-description: warn
    tags-alphabetical: off
    parameter-description: off
    no-path-trailing-slash: error
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
    operation-security-defined: error
    operation-singular-tag: off
    no-unresolved-refs: error
    no-enum-type-mismatch: error
    boolean-parameter-prefixes: off
    paths-kebab-case: off
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

## Built-in rule ideas

Redocly CLI supports [custom rules](./custom-rules.md).
However, if you have an idea for a built-in rule you believe will benefit the greater API community, please [open an issue](https://github.com/Redocly/redocly-cli/issues/new) in the Redocly CLI repository.
