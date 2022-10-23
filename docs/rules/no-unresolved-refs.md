# no-unresolved-refs

Ensures that all `$ref` instances in your API definitions are resolved.

|OAS|Compatibility|
|---|---|
|2.0|✅|
|3.0|✅|
|3.1|✅|


## API design principles

The `$ref` (reference object) is useful for keeping your OpenAPI definitions DRY (don't repeat yourself).
But if you make a typo, your `$ref` might not be resolvable.
This rule prevents that from happening.

## Configuration


|Option|Type|Description|
|---|---|---|
|severity|string|Possible values: `off`, `warn`, `error`. Default `error` (in `recommended` configuration). |

An example configuration:

```yaml
rules:
  no-unresolved-refs: error
```

## Examples

Given this configuration:

```yaml
rules:
  no-unresolved-refs: error
```

Example of an **incorrect** `$ref`:

```yaml
components:
  schemas:
    Car:
      type: object
      properties:
        color:
          type: string
        tires:
          $ref: '#/components/schemas/Tires'
    Tire:
      type: object
      properties:
        name:
          type: string
        size:
          type: string
```

Example of a **correct** `$ref`:

```yaml
components:
  schemas:
    Car:
      type: object
      properties:
        color:
          type: string
        tires:
          $ref: '#/components/schemas/Tire'
    Tire:
      type: object
      properties:
        name:
          type: string
        size:
          type: string
```

## Related rules

- [spec](./spec.md)
- [custom rules](./custom-rules.md)
- [no-unused-components](./no-unused-components.md)

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/no-unresolved-refs.ts)
- Read our guide on [how to use JSON references ($refs)](/docs/resources/ref-guide.md)

