# operation-singular-tag

Disallows multiple tags for an operation.

|OAS|Compatibility|
|---|---|
|2.0|✅|
|3.0|✅|
|3.1|✅|


## API design principles

OpenAPI tags can be used for different purposes.
In many cases, they are used like categories and an operation should belong to a single category.

This rule is opinionated.
It simplifies organization.
Simple wins.

## Configuration


|Option|Type|Description|
|---|---|---|
|severity|string|Possible values: `off`, `warn`, `error`. Default `off` (in `recommended` configuration). |

An example configuration:

```yaml
rules:
  operation-singular-tag: error
```

## Examples

Given this configuration:

```yaml
rules:
  operation-singular-tag: error
```

Example of **incorrect** operation:

```yaml
post:
  tags:
    - Customers
    - Subscriptions
  operationId: # ...
```

Example of **correct** operation:

```yaml
post:
  tags:
    - Customers
  operationId: # ...
```

## Related rules

- [operation-tag-defined](./operation-tag-defined.md)
- [operation-summary](./operation-summary.md)

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/common/operation-singular-tag.ts)
- [Operation object docs](https://redocly.com/docs/openapi-visual-reference/operation/)
- [Tags docs](https://redocly.com/docs/openapi-visual-reference/tags/)
