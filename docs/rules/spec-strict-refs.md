# spec-strict-refs

Check that `$ref` is only used in the locations permitted by the OpenAPI specification.

| OAS | Compatibility |
| --- | ------------- |
| 2.0 | ✅            |
| 3.0 | ✅            |
| 3.1 | ✅            |

## API design principles

This rule is for spec correctness.

Allows to use the `$ref` keyword exclusively for references to elements that may be inside the component section

It can be useful when other tools are integrated into the API workflow, that demand strict adherence to the specifications.

List of elements with which the `$ref` can be used:

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

To configure the rule, add it to the `rules` object in your configuration file.
Set the desired [severity](/docs/cli/rules.md#severity-settings) for the rule.

```yaml
rules:
  spec-strict-refs: error
```

## Configuration

| Option   | Type   | Description                              |
| -------- | ------ | ---------------------------------------- |
| severity | string | Possible values: `off`, `warn`, `error`. |

An example configuration:

```yaml
rules:
  spec-strict-refs: error
```

## Examples

Given this configuration:

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

- [configurable rules](./configurable-rules.md)
- [spec](./spec.md)

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/common/spec-strict-refs.ts)
- [Components docs](https://redocly.com/docs/openapi-visual-reference/reference/)
