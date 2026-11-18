# spec-action-workflowId-defined

The `workflowId` of a success or failure action must reference an existing workflow.

| Arazzo | Compatibility |
| ------ | ------------- |
| 1.x    | ✅            |

## Design principles

An action with the `goto` type can transfer control to another workflow with the `workflowId` field.
A failure action with the `retry` type can run another workflow before the retry.
The Arazzo specification defines the field as a reference to an existing workflow within the Arazzo description.
A tool cannot run an action that points to a missing workflow.

The `spec-action-workflowId-defined` rule checks both forms of the field:

- A plain `workflowId` must match a workflow in the `workflows` list of the same document.
- A reference to a workflow of another Arazzo document must have the `$sourceDescriptions.<name>.<workflowId>` form, and the source description must have the `arazzo` type.

The rule checks the actions in the `onSuccess` and `onFailure` fields of a step, and in the `successActions` and `failureActions` fields of a workflow.
It checks an action from `components` once, where the action is defined.
The rule does not check the `workflowId` of an action with the `end` type, because the field is not relevant there.
The rule does not open the other Arazzo document, so it does not check that the workflow exists there.
The [spec-sourceDescriptions-defined](./spec-sourceDescriptions-defined.md) rule reports a source description name that is not defined.

## Configuration

| Option   | Type   | Description                                                                                 |
| -------- | ------ | ------------------------------------------------------------------------------------------- |
| severity | string | Possible values: `off`, `warn`, `error`. Default: `error` (in `recommended` configuration). |

An example configuration:

```yaml
rules:
  spec-action-workflowId-defined: error
```

## Examples

Given the following configuration:

```yaml
rules:
  spec-action-workflowId-defined: error
```

Example of an **incorrect** action that references a workflow the document does not define:

```yaml Incorrect example
workflows:
  - workflowId: place-order
    steps:
      - stepId: create-order
        operationId: cafe-api.createOrder
        onSuccess:
          - name: continue-to-payment
            type: goto
            workflowId: pay-for-order
```

Example of **correct** actions that reference a workflow of the same document and a workflow of an Arazzo source description:

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
        onSuccess:
          - name: continue-to-payment
            type: goto
            workflowId: $sourceDescriptions.payments.pay-for-order
        onFailure:
          - name: retry-after-refresh
            type: retry
            workflowId: refresh-menu
  - workflowId: refresh-menu
    steps:
      - stepId: list-menu-items
        operationId: cafe-api.listMenuItems
```

## Related rules

- [spec-action-mutually-exclusive-fields](./spec-action-mutually-exclusive-fields.md)
- [spec-sourceDescriptions-defined](./spec-sourceDescriptions-defined.md)
- [workflowId-unique](./workflowId-unique.md)

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/arazzo/spec-action-workflowId-defined.ts)
- [Success Action Object](https://spec.openapis.org/arazzo/latest.html#success-action-object) and [Failure Action Object](https://spec.openapis.org/arazzo/latest.html#failure-action-object) in the Arazzo specification
