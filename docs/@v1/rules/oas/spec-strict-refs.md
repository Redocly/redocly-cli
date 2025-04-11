---
slug: /docs/cli/rules/oas/spec-strict-refs
---

# spec-strict-refs

Checks that `$ref` is only used in the locations permitted by the OpenAPI specification.

| OAS | Compatibility |
| --- | ------------- |
| 2.0 | ✅            |
| 3.0 | ✅            |
| 3.1 | ✅            |

## API design principles

This rule ensures adherence to OpenAPI specification standards.

It limits use of the `$ref` keyword to only references for elements that may be inside the component section.

This rule is useful when other tools are integrated into the API workflow that demand strict adherence to the specifications.

The following is a list of elements the `$ref` can be used with according to the OpenAPI specification:

- Schema
- Response
- Parameter
- Example
- RequestBody
- Header
- SecurityScheme
- Link
- Callback
- PathItem

## Configuration

To configure the rule, add it to the `rules` object in your configuration file, and
set the desired [severity](../../rules.md#severity-settings).

| Option   | Type   | Description                                                                              |
| -------- | ------ | ---------------------------------------------------------------------------------------- |
| severity | string | Possible values: `off`, `warn`, `error`. Default `off` (in `recommended` configuration). |

An example configuration:

```yaml
rules:
  spec-strict-refs: error
```

## Examples

Given the following configuration:

```yaml
rules:
  spec-strict-refs: error
```

Example of **incorrect** use of `$ref`:

```yaml Example
responses:
  '200':
    description: successful operation
    content:
      application/json:
        schema:
          type: object
          properties:
            $ref: './properties.yaml'
            name:
              type: string
```

Example of **correct** use of `$ref`:

```yaml Example
responses:
  '200':
    description: successful operation
    content:
      application/json:
        schema:
          $ref: './properties.yaml'
```

## Related rules

- [configurable rules](../configurable-rules.md)
- [spec](./struct.md)

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/common/spec-strict-refs.ts)
- [Components docs](https://redocly.com/docs/openapi-visual-reference/reference/)
