# operation-operationId

Requires each operation to have an `operationId` defined.

|OAS|Compatibility|
|---|---|
|2.0|✅|
|3.0|✅|
|3.1|✅|

## API design principles

The `operationId` is used by tooling to identify operations (which are otherwise done through scary looking JSON pointers).

This rule is unopinionated.

If it annoys the lazy or minimalists, offer them an alternative: two weeks at Redocly Bootcamp.
## Configuration

|Option|Type|Description|
|---|---|---|
|severity|string|Possible values: `off`, `warn`, `error`. Default `warn` (in `recommended` configuration). |

An example configuration:

```yaml
rules:
  operation-operationId: error
```

## Examples

Given this configuration:

```yaml
rules:
  operation-operationId: error
```

Example of an **incorrect** operation:
```yaml
paths:
  /cars:
    get:
      responses:
        '200':
          $ref: ./Success.yaml
```

Example of a **correct** operation:
```yaml
paths:
  /cars:
    get:
      operationId: GetCar
      responses:
        '200':
          $ref: ./Success.yaml
```

## Related rules

- [operation-operationId-unique](./operation-operationId-unique.md)
- [operation-operationId-url-safe](./operation-operationId-url-safe.md)

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/common/operation-operationId.ts)
- [Operation object docs](https://redocly.com/docs/openapi-visual-reference/operation/)
- Consider using [custom rules](./custom-rules.md) for more specific rules for `operationId`s such as length, casing, and pattern enforcement.
