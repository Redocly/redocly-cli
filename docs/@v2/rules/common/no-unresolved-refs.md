---
slug: /docs/cli/rules/oas/no-unresolved-refs
---

# no-unresolved-refs

Ensures that all `$ref` instances in your API descriptions are resolved.

| OAS | Compatibility |
| --- | ------------- |
| 2.0 | ✅            |
| 3.0 | ✅            |
| 3.1 | ✅            |
| 3.2 | ✅            |

| AsyncAPI | Compatibility |
| -------- | ------------- |
| 2.6      | ✅            |
| 3.0      | ✅            |

| Arazzo | Compatibility |
| ------ | ------------- |
| 1.x    | ✅            |

| Overlay | Compatibility |
| ------- | ------------- |
| 1.x     | ✅            |

The default setting for this rule (in the `spec`, `recommended`, and `minimal` configuration) is `error`.

## API design principles

The `$ref` (reference object) is useful for keeping your OpenAPI descriptions DRY (don't repeat yourself).
But if you make a typo, your `$ref` might not be resolvable.
This rule prevents that from happening.

## Configuration

| Option   | Type   | Description                                                                                |
| -------- | ------ | ------------------------------------------------------------------------------------------ |
| severity | string | Possible values: `off`, `warn`, `error`. Default `error` (in `recommended` configuration). |

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

- [struct](./struct.md)
- [configurable rules](../configurable-rules.md)
- [no-unused-components](../oas/no-unused-components.md)

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/no-unresolved-refs.ts)
- Read our guide on [how to use JSON references ($refs)](https://redocly.com/docs/resources/ref-guide)
