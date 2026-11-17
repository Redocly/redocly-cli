# spec-action-mutually-exclusive-fields

A success or failure action must use only one of the `stepId` and `workflowId` fields.

| Arazzo | Compatibility |
| ------ | ------------- |
| 1.x    | ✅            |

## Design principles

The Arazzo specification defines two fields that point a success or failure action to its target: `stepId` and `workflowId`.
These fields are mutually exclusive: an action transfers to a step of the current workflow or to another workflow, not to both.
This rule reports an action that uses both fields at the same time.

The rule checks the actions in the `onSuccess` and `onFailure` lists of a step, in the `successActions` and `failureActions` lists of a workflow, and in the `successActions` and `failureActions` maps of the `components` object.
It applies to every action type, because the specification does not limit the requirement to `goto` actions.

## Configuration

| Option   | Type   | Description                                             |
| -------- | ------ | ------------------------------------------------------- |
| severity | string | Possible values: `off`, `warn`, `error`. Default `off`. |

An example configuration:

```yaml
rules:
  spec-action-mutually-exclusive-fields: error
```

## Examples

Given the following configuration:

```yaml
rules:
  spec-action-mutually-exclusive-fields: error
```

Example of an **incorrect** action that uses both target fields:

```yaml Incorrect example
workflows:
  - workflowId: place-order
    steps:
      - stepId: list-menu-items
        operationId: cafe-api.listMenuItems
        onSuccess:
          - name: continue-to-order
            type: goto
            stepId: create-order
            workflowId: place-order
```

Example of a **correct** action that uses a single target field:

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
```

## Related rules

- [spec-step-mutually-exclusive-fields](./spec-step-mutually-exclusive-fields.md)
- [step-onSuccess-unique](./step-onSuccess-unique.md)
- [step-onFailure-unique](./step-onFailure-unique.md)

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/arazzo/spec-action-mutually-exclusive-fields.ts)
- [Success Action Object](https://spec.openapis.org/arazzo/latest.html#success-action-object)
- [Failure Action Object](https://spec.openapis.org/arazzo/latest.html#failure-action-object)
