# spec-action-stepId-defined

The `stepId` of a success or failure action must reference a step defined in the current workflow.

| Arazzo | Compatibility |
| ------ | ------------- |
| 1.x    | ✅            |

## Design principles

An action with the `goto` type can transfer the workflow to another step with the `stepId` field.
A failure action with the `retry` type can do the same.
The Arazzo specification requires that step to be within the current workflow.
A tool cannot run an action that points to a missing step, or to a step of another workflow.

The `spec-action-stepId-defined` rule checks the actions listed in the `onSuccess` and `onFailure` fields of a step, and in the `successActions` and `failureActions` fields of a workflow.
This rule checks an action from `components` in every workflow that references it.
The same action can be valid in one workflow and not valid in another.
The rule does not check the `stepId` of an action with the `end` type, because the field is not relevant there.

To transfer to a step of another workflow, reference that workflow with the `workflowId` field instead.

## Configuration

| Option   | Type   | Description                                              |
| -------- | ------ | -------------------------------------------------------- |
| severity | string | Possible values: `off`, `warn`, `error`. Default: `off`. |

An example configuration:

```yaml
rules:
  spec-action-stepId-defined: error
```

## Examples

Given the following configuration:

```yaml
rules:
  spec-action-stepId-defined: error
```

Example of an **incorrect** action that references a step the workflow does not define:

```yaml Incorrect example
workflows:
  - workflowId: place-order
    steps:
      - stepId: list-menu-items
        operationId: cafe-api.listMenuItems
        onSuccess:
          - name: continue-to-order
            type: goto
            stepId: submit-order
      - stepId: create-order
        operationId: cafe-api.createOrder
```

Example of a **correct** action that references a step of the same workflow:

```yaml Correct example
workflows:
  - workflowId: place-order
    steps:
      - stepId: list-menu-items
        operationId: cafe-api.listMenuItems
        onSuccess:
          - name: continue-to-order
            type: goto
            stepId: create-order
      - stepId: create-order
        operationId: cafe-api.createOrder
```

## Related rules

- [stepId-unique](./stepId-unique.md)
- [step-onSuccess-unique](./step-onSuccess-unique.md)
- [step-onFailure-unique](./step-onFailure-unique.md)

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/arazzo/spec-action-stepId-defined.ts)
- [Success Action Object](https://spec.openapis.org/arazzo/latest.html#success-action-object) and [Failure Action Object](https://spec.openapis.org/arazzo/latest.html#failure-action-object) in the Arazzo specification
