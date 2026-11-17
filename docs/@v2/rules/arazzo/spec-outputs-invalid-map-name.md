# spec-outputs-invalid-map-name

Requires the names in the `outputs` of a workflow or a step to match the regular expression `^[a-zA-Z0-9\.\-_]+$`.

| Arazzo | Compatibility |
| ------ | ------------- |
| 1.x    | ✅            |

## Design principles

The Arazzo specification defines `outputs` as a map between a friendly name and a dynamic output value.
The name must use only letters, digits, dots, hyphens, and underscores.
Other parts of the description refer to an output by its name in a runtime expression, such as `$steps.create-order.outputs.orderId`.
A name with a space or another character outside the pattern cannot be referenced that way.
This rule reports each output name of a workflow or a step that does not match the pattern.

## Configuration

| Option   | Type   | Description                                             |
| -------- | ------ | ------------------------------------------------------- |
| severity | string | Possible values: `off`, `warn`, `error`. Default `off`. |

An example configuration:

```yaml
rules:
  spec-outputs-invalid-map-name: error
```

## Examples

Given the following configuration:

```yaml
rules:
  spec-outputs-invalid-map-name: error
```

Example of an **incorrect** output name that contains a space:

```yaml Incorrect example
workflows:
  - workflowId: place-order
    steps:
      - stepId: create-order
        operationId: cafe-api.createOrder
        outputs:
          order id: $response.body#/id
```

Example of **correct** output names:

```yaml Correct example
workflows:
  - workflowId: place-order
    steps:
      - stepId: create-order
        operationId: cafe-api.createOrder
        outputs:
          orderId: $response.body#/id
    outputs:
      order.id: $steps.create-order.outputs.orderId
```

## Related rules

- [outputs-defined](./outputs-defined.md)
- [spec-components-invalid-map-name](../oas/spec-components-invalid-map-name.md)

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/arazzo/spec-outputs-invalid-map-name.ts)
- [Workflow Object](https://spec.openapis.org/arazzo/latest.html#workflow-object) and [Step Object](https://spec.openapis.org/arazzo/latest.html#step-object) in the Arazzo specification
