# operation-summary

Enforce that every operation has a summary.

|OAS|Compatibility|
|---|---|
|2.0|✅|
|3.0|✅|
|3.1|✅|


## API design principles

Operation summaries are used to generate API docs.
Redocly uses the summary as the header for the operation, as well as the sidebar navigation text.

## Configuration


|Option|Type|Description|
|---|---|---|
|severity|string|Possible values: `off`, `warn`, `error`. Default `error` (in `recommended` configuration). |

An example configuration:

```yaml
rules:
  operation-summary: error
```

## Examples

Given this configuration:

```yaml
rules:
  operation-summary: error
```

Example of **incorrect** operation:

```yaml
post:
  tags:
    - Customers
  operationId: # ...
```

Example of **correct** operation:

```yaml
post:
  summary: Create a customer
  tags:
    - Customers
  operationId: # ...
```

## Related rules

- [operation-description](./operation-description.md)
- [custom rules](./custom-rules.md)
- [operation-operationId-unique](./operation-operationId-unique.md)

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/common/operation-summary.ts)
- [Operation object docs](https://redocly.com/docs/openapi-visual-reference/operation/)
