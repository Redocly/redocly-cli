# parameter-description

Ensure that every parameter has a description.

|OAS|Compatibility|
|---|---|
|2.0|✅|
|3.0|✅|
|3.1|✅|


## API design principles

A parameter should have a description because documentation is important.
That parameter `filter` that is self-documenting and intuitive is the same filter that you need to look into the source code to determine what kind of values to provide to it 7 months from now.
Document it!

## Configuration


|Option|Type|Description|
|---|---|---|
|severity|string|Possible values: `off`, `warn`, `error`. Default `off` (in `recommended` configuration). |

An example configuration:

```yaml
rules:
  parameter-description: error
```

## Examples


Given this configuration:

```yaml
rules:
  parameter-description: error
```

Example of an **incorrect** parameter:

```yaml
paths:
  /customers/{id}:
    post:
      parameters:
        - name: id
          in: path
          required: true
```

Example of a **correct** parameter:

```yaml
paths:
  /customers/{id}:
    post:
      parameters:
        - name: id
          in: path
          required: true
          description: The customer's ID.
```

## Related rules

- [tag-description](./tag-description.md)
- [operation-description](./operation-description.md)
- [custom rules](./custom-rules.md)

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/common/parameter-description.ts)
- [Parameter docs](https://redocly.com/docs/openapi-visual-reference/parameter/)
