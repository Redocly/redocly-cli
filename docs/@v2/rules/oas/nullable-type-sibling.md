---
slug: /docs/cli/v2/rules/oas/nullable-type-sibling
---

# nullable-type-sibling

Ensures that all schemas with `nullable` field have a `type` field explicitly set.

| OAS | Compatibility |
| --- | ------------- |
| 3.0 | ✅            |

## API design principles

The `nullable` field is not allowed without the `type` field explicitly set.

## Configuration

| Option   | Type   | Description                                                                                |
| -------- | ------ | ------------------------------------------------------------------------------------------ |
| severity | string | Possible values: `off`, `warn`, `error`. Default `error` (in `recommended` configuration). |

An example configuration:

```yaml
rules:
  nullable-type-sibling: error
```

## Examples

Given this configuration:

```yaml
rules:
  nullable-type-sibling: error
```

Example of an **incorrect** usage of `nullable` field:

```yaml
components:
  schemas:
    Incorrect:
      nullable: true
    ReferencingATypeButStillIncorrect:
      nullable: true
      allOf:
        - $ref: '#/components/schemas/SomeType'
    SomeType:
      type: string

```

Example of a **correct** usage:

```yaml
components:
  schemas:
    Correct:
      type: string
      nullable: true
    CorrectWithAllOf:
      type: object
      nullable: true
      allOf:
        - type: object
          properties:
            name:
              type: string
        - type: object
          properties:
            age:
              type: number
```

## Related rules

- [struct](../common/struct.md)

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/oas3/nullable-type-sibling.ts)
- [Examples](https://redocly.com/learn/openapi/openapi-visual-reference/null)
