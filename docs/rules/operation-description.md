# operation-description

Requires the `description` field for every operation in your API.

|OAS|Compatibility|
|---|---|
|2.0|✅|
|3.0|✅|
|3.1|✅|


## API design principles

Every operation should have a description to help your API consumers understand what it does and how to use it.
Without a description, people who want to use your API have to guess what an operation does, or try to decipher it from other parts of your API definition, or from other documentation and external resources that may not be accurate. Your API definition should be the single source of truth about your API.

Okay, so we're documentation folks here.
You're thinking, "of course they would say that."
You're right!
And we're right!
Do this, and your (future) teammates will thank you.
Do this, and your API consumers will thank you.

## Configuration

|Option|Type|Description|
|---|---|---|
|severity|string|Possible values: `off`, `warn`, `error`. Default `off` (in `recommended` configuration). |

An example configuration:

```yaml
rules:
  operation-description: error
```

## Examples

Given this configuration:

```yaml
rules:
  operation-description: error
```

Example of an **incorrect** operation:
```yaml
get:
  responses:
    '200':
      $ref: ../components/responses/Success.yaml
```

Example of a **correct** operation:

```yaml Example
get:
  description: Returns the latest updated user profile.
  responses:
    '200':
      $ref: ../components/responses/Success.yaml
```

## Related rules

- [tag-description](./tag-description.md)
- [parameter-description](./parameter-description.md)
- [operation-summary](./operation-summary.md)
- [custom rules](./custom-rules.md)
- [operation-operationId](./operation-operationId.md)

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/common/operation-description.ts)
- Consider using [custom rules](./custom-rules.md) for more specific rules for operation descriptions such as minimum length and pattern enforcement.
- [Operation object docs](https://redocly.com/docs/openapi-visual-reference/operation/)
