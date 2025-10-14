---
slug: /docs/cli/rules/oas/example-values
---

# example-values

Ensures that example objects have valid field combinations according to the OpenAPI 3.2.0 specification.

| OAS | Compatibility |
| --- | ------------- |
| 2.0 | ❌            |
| 3.0 | ✅            |
| 3.1 | ✅            |
| 3.2 | ✅            |

```mermaid
flowchart TD

Root --> Paths --> PathItem --> Operation --> RequestBody --> MediaType --> Example
Operation --> Responses --> MediaType
style Example fill:#codaf9,stroke:#0044d4,stroke-width:5px

```

## API design principles

According to the OpenAPI 3.2.0 specification, example objects have strict rules about which fields can be used together.
This rule ensures that only valid field combinations are used in example objects.

## Configuration

| Option   | Type   | Description                                                                                |
| -------- | ------ | ------------------------------------------------------------------------------------------ |
| severity | string | Possible values: `off`, `warn`, `error`. Default `error` (in `recommended` configuration). |

An example configuration:

```yaml
rules:
  example-values: error
```

## Examples

Given this configuration:

```yaml
rules:
  example-values: error
```

Example of **incorrect** example objects:

```yaml Bad example
components:
  schemas:
    User:
      type: object
      properties:
        name:
          type: string
      examples:
        invalid-data-value-and-value:
          dataValue:
            name: "John Doe"
          value:
            name: "Jane Doe"
        invalid-serialized-value-and-value:
          serializedValue: '{"name":"John Doe"}'
          value:
            name: "Jane Doe"
        invalid-external-value-and-value:
          externalValue: "https://example.com/user-example.json"
          value:
            name: "Jane Doe"
```

Example of **correct** example objects:

```yaml Good example
components:
  schemas:
    User:
      type: object
      properties:
        name:
          type: string
      examples:
        valid-data-value:
          dataValue:
            name: "John Doe"
        valid-serialized-value:
          serializedValue: '{"name":"John Doe"}'
        valid-external-value:
          externalValue: "https://example.com/user-example.json"
```

## Related rules

- [struct](../common/struct.md)
- [no-example-value-and-externalValue](./no-example-value-and-externalValue.md)
- [no-invalid-encoding-combinations](./no-invalid-encoding-combinations.md)
- [discriminator-defaultMapping](./discriminator-defaultMapping.md)
- [no-invalid-tag-parents](./no-invalid-tag-parents.md)

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/oas3/example-values.ts)
- [Example object docs](https://redocly.com/docs/openapi-visual-reference/example/)
