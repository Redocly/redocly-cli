# spec-step-parameters-in-required

Requires the `in` field on the parameters of a step that calls an operation.

| Arazzo | Compatibility |
| ------ | ------------- |
| 1.x    | ✅            |

## Design principles

A step parameter is sent to an operation or passed to another workflow.
When the step uses `workflowId`, its parameters map to the inputs of that workflow, and the `in` field is not needed.
In all other cases the Arazzo specification requires the `in` field.
The `in` field tells where the parameter goes in the request: `path`, `query`, `header`, or `cookie`.
Arazzo 1.1 also allows `querystring`.
Without the `in` field, a tool cannot place the value, and Respect leaves such a parameter out of the request.

The `spec-step-parameters-in-required` rule reports each parameter without `in` in a step that does not use `workflowId`.
For a parameter that a step takes from `components` with a `reference`, the rule checks the referenced parameter and reports the step parameter.

The rule does not check the parameters of a workflow, because they apply to all of its steps, including the steps that use `workflowId`.
The [struct](../common/struct.md) rule reports an `in` value that the specification does not define.

## Configuration

| Option   | Type   | Description                                                                                 |
| -------- | ------ | ------------------------------------------------------------------------------------------- |
| severity | string | Possible values: `off`, `warn`, `error`. Default: `error` (in `recommended` configuration). |

An example configuration:

```yaml
rules:
  spec-step-parameters-in-required: error
```

## Examples

Given the following configuration:

```yaml
rules:
  spec-step-parameters-in-required: error
```

Example of an **incorrect** step parameter:

```yaml Incorrect example
workflows:
  - workflowId: get-order
    steps:
      - stepId: get-order
        operationId: cafe-api.getOrderById
        parameters:
          - name: orderId
            value: $inputs.orderId
```

Example of **correct** step parameters:

```yaml Correct example
workflows:
  - workflowId: get-order
    steps:
      - stepId: get-order
        operationId: cafe-api.getOrderById
        parameters:
          - name: orderId
            in: path
            value: $inputs.orderId
      - stepId: pay-for-order
        workflowId: pay-for-order
        parameters:
          - name: orderId
            value: $inputs.orderId
```

## Related rules

- [parameters-unique](./parameters-unique.md)
- [spec-querystring-parameters](./spec-querystring-parameters.md)
- [spec-step-mutually-exclusive-fields](./spec-step-mutually-exclusive-fields.md)

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/arazzo/spec-step-parameters-in-required.ts)
- [Parameter Object in the Arazzo specification](https://spec.openapis.org/arazzo/latest.html#parameter-object)
