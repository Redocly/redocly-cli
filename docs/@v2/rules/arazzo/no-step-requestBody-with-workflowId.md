# no-step-requestBody-with-workflowId

Disallows the `requestBody` field in a step that uses `workflowId`.

| Arazzo | Compatibility |
| ------ | ------------- |
| 1.x    | ✅            |

## Design principles

The Arazzo specification defines the `requestBody` of a step as the request body to pass to an operation.
A step that uses `workflowId` runs another workflow instead of calling an operation, so it has no request to carry the body.
The specification does not define what happens to such a `requestBody`, and a tool can ignore it without telling you.

To pass values to the workflow, use the `parameters` of the step.
They map to the inputs of the workflow.

The specification does not forbid the field with a `MUST NOT`, and the Arazzo JSON Schema accepts `requestBody` in every step.
That is why the [struct](../common/struct.md) rule does not report it, and why the `no-step-requestBody-with-workflowId` rule is not part of the `spec` ruleset.

## Configuration

| Option   | Type   | Description                                                                                 |
| -------- | ------ | ------------------------------------------------------------------------------------------- |
| severity | string | Possible values: `off`, `warn`, `error`. Default: `error` (in `recommended` configuration). |

An example configuration:

```yaml
rules:
  no-step-requestBody-with-workflowId: error
```

## Examples

Given the following configuration:

```yaml
rules:
  no-step-requestBody-with-workflowId: error
```

Example of an **incorrect** step:

```yaml Incorrect example
workflows:
  - workflowId: order-for-ada
    steps:
      - stepId: create-order
        workflowId: create-order
        requestBody:
          payload:
            customerName: Ada
```

Example of **correct** steps:

```yaml Correct example
workflows:
  - workflowId: create-order
    inputs:
      type: object
      properties:
        customerName:
          type: string
    steps:
      - stepId: create-order
        operationId: cafe-api.createOrder
        requestBody:
          payload:
            customerName: $inputs.customerName
  - workflowId: order-for-ada
    steps:
      - stepId: create-order
        workflowId: create-order
        parameters:
          - name: customerName
            value: Ada
```

## Related rules

- [requestBody-replacements-unique](./requestBody-replacements-unique.md)
- [spec-step-mutually-exclusive-fields](./spec-step-mutually-exclusive-fields.md)
- [spec-step-parameters-in-required](./spec-step-parameters-in-required.md)

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/arazzo/no-step-requestBody-with-workflowId.ts)
- [Step Object in the Arazzo specification](https://spec.openapis.org/arazzo/latest.html#step-object)
