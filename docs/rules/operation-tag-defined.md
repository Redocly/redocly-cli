# operation-tag-defined

Disallows use of tags in operations that aren't globally defined.

|OAS|Compatibility|
|---|---|
|2.0|✅|
|3.0|✅|
|3.1|✅|


## API design principles

OpenAPI tags can be used for different purposes.
Tags are declared in the root of the OpenAPI definition.
Then, they are used in operations.

This rule says that if an operation uses a tag, it must be defined in the root tags declaration.
This rule helps prevent typos and tag explosion.

## Configuration


|Option|Type|Description|
|---|---|---|
|severity|string|Possible values: `off`, `warn`, `error`. Default `off` (in `recommended` configuration). |

An example configuration:

```yaml
rules:
  operation-tag-defined: error
```

## Examples


Given this configuration:

```yaml
rules:
  operation-tag-defined: error
```

Example of **incorrect** operation:

```yaml
tags:
  - name: Anchovy
paths:
  /customers:
    post:
      tags:
        - Customers
      operationId: # ...
```

Example of **correct** operation:

```yaml
tags:
  - name: Anchovy
  - name: Customers
paths:
  /customers:
    post:
      tags:
        - Customers
      operationId: # ...
```

## Related rules

- [operation-singular-tag](./operation-singular-tag.md)
- [tags-alphabetical](./tags-alphabetical.md)
- [tag-description](./tag-description.md)
- [custom rules](./custom-rules.md)

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/common/operation-tag-defined.ts)
- [Operation object docs](https://redocly.com/docs/openapi-visual-reference/operation/)
- [Tags docs](https://redocly.com/docs/openapi-visual-reference/tags/)
