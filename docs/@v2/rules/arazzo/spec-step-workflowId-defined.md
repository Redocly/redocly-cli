# spec-step-workflowId-defined

The `workflowId` of a step must reference an existing workflow.

| Arazzo | Compatibility |
| ------ | ------------- |
| 1.x    | ✅            |

## Design principles

A step can run another workflow with the `workflowId` field.
The Arazzo specification defines the field as a reference to an existing workflow within the Arazzo description.
A tool cannot run a step that points to a missing workflow.

The `spec-step-workflowId-defined` rule checks both forms of the field:

- A plain `workflowId` must match a workflow in the `workflows` list of the same document.
- A `$sourceDescriptions.<name>.<workflowId>` expression must name a source description that is defined in `sourceDescriptions` and has the `arazzo` type.

The rule does not open the other Arazzo document, so it does not check that the workflow exists there.

## Configuration

| Option   | Type   | Description                                                                                 |
| -------- | ------ | ------------------------------------------------------------------------------------------- |
| severity | string | Possible values: `off`, `warn`, `error`. Default: `error` (in `recommended` configuration). |

An example configuration:

```yaml
rules:
  spec-step-workflowId-defined: error
```

## Examples

Given the following configuration:

```yaml
rules:
  spec-step-workflowId-defined: error
```

Example of an **incorrect** step that references a workflow the document does not define:

```yaml Incorrect example
workflows:
  - workflowId: place-order
    steps:
      - stepId: create-order
        operationId: cafe-api.createOrder
  - workflowId: order-and-pay
    steps:
      - stepId: order
        workflowId: submit-order
```

Example of **correct** steps that reference a workflow of the same document and a workflow of an Arazzo source description:

```yaml Correct example
sourceDescriptions:
  - name: cafe-api
    type: openapi
    url: openapi.yaml
  - name: payments
    type: arazzo
    url: payments.arazzo.yaml
workflows:
  - workflowId: place-order
    steps:
      - stepId: create-order
        operationId: cafe-api.createOrder
  - workflowId: order-and-pay
    steps:
      - stepId: order
        workflowId: place-order
      - stepId: pay
        workflowId: $sourceDescriptions.payments.pay-for-order
```

## Related rules

- [spec-step-mutually-exclusive-fields](./spec-step-mutually-exclusive-fields.md)
- [workflowId-unique](./workflowId-unique.md)
- [workflow-dependsOn](./workflow-dependsOn.md)

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/arazzo/spec-step-workflowId-defined.ts)
- [Step Object](https://spec.openapis.org/arazzo/latest.html#step-object) in the Arazzo specification
