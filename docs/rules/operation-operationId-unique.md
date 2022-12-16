# operation-operationId-unique

Requires unique `operationId` values for each operation.

|OAS|Compatibility|
|---|---|
|2.0|✅|
|3.0|✅|
|3.1|✅|

## API design principle

The `operationId` is used by tooling to identify operations (which are otherwise done through scary looking JSON pointers).

The `operationId` should be unique (used only once in an OpenAPI definition).

This rule is unopinionated.

## Configuration

|Option|Type|Description|
|---|---|---|
|severity|string|Possible values: `off`, `warn`, `error`. Default `error` (in `recommended` configuration). |

An example configuration:

```yaml
rules:
  operation-operationId-unique: error
```

## Examples

Given this configuration:

```yaml
rules:
  operation-operationId-unique: error
```

Example of **incorrect** operations:
```yaml
paths:
  /cars:
    get:
      operationId: Car
      # ...
    post:
      operationId: Car
      # ...
```

Example of **correct** operations:
```yaml
paths:
  /cars:
    get:
      operationId: getCar
      # ...
    post:
      operationId: postCar
      # ...
```

## Related rules

- [operation-summary](./operation-summary.md)
- [operation-operationId-url-safe](./operation-operationId-url-safe.md)
- [operation-operationId](./operation-operationId.md)
- [custom rules](./custom-rules.md)

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/common/operation-operationId-unique.ts)
- [Operation object docs](https://redocly.com/docs/openapi-visual-reference/operation/)
- Consider using [custom rules](./custom-rules.md) for more specific rules for `operationId`s such as length, casing, and pattern enforcement.
