# spec-step-dependsOn-defined

Each value in the `dependsOn` list of a step must reference a defined step.

| Arazzo | Compatibility |
| ------ | ------------- |
| 1.0.x  | ❌            |
| 1.1.x  | ✅            |

## Design principles

Arazzo 1.1.0 adds the `dependsOn` field to a step.
The field lists the steps that must complete before the step runs.
The Arazzo specification requires each value in the list to be a `stepId`.
A tool cannot wait for a step that does not exist.

The `spec-step-dependsOn-defined` rule checks both forms that point to a step of the same document:

- A plain `stepId` must match a step of the current workflow.
- A reference to a step of another workflow must have the form `$workflows.<workflowId>.steps.<stepId>`.
  It must name a workflow of the same document and a step of that workflow.

The rule treats every other value as a plain `stepId`.
For example, it reports `$steps.create-order`, because no step of the workflow has that `stepId`.

A reference to a step of another Arazzo document has the form `$sourceDescriptions.<name>.<workflowId>.steps.<stepId>`.
The rule does not open the other Arazzo document, so it does not check that the workflow and the step exist there.
The [spec-sourceDescriptions-defined](./spec-sourceDescriptions-defined.md) rule reports a reference to a source description that is not defined.

## Configuration

| Option   | Type   | Description                                                                                |
| -------- | ------ | ------------------------------------------------------------------------------------------ |
| severity | string | Possible values: `off`, `warn`, `error`. Default `error` (in `recommended` configuration). |

An example configuration:

```yaml
rules:
  spec-step-dependsOn-defined: error
```

## Examples

Given the following configuration:

```yaml
rules:
  spec-step-dependsOn-defined: error
```

Example of an **incorrect** step that depends on a missing step, and on a step of a missing workflow:

```yaml Incorrect example
workflows:
  - workflowId: place-order
    steps:
      - stepId: create-order
        operationId: cafe-api.createOrder
      - stepId: get-order
        operationId: cafe-api.getOrderById
        dependsOn:
          - submit-order
          - $workflows.checkout.steps.create-order
```

Example of a **correct** step that depends on steps of the same workflow, of another workflow, and of an Arazzo source description:

```yaml Correct example
sourceDescriptions:
  - name: cafe-api
    type: openapi
    url: openapi.yaml
  - name: loyalty
    type: arazzo
    url: loyalty.arazzo.yaml
workflows:
  - workflowId: browse-menu
    steps:
      - stepId: list-menu-items
        operationId: cafe-api.listMenuItems
  - workflowId: place-order
    steps:
      - stepId: create-order
        operationId: cafe-api.createOrder
      - stepId: get-order
        operationId: cafe-api.getOrderById
        dependsOn:
          - create-order
          - $workflows.browse-menu.steps.list-menu-items
          - $sourceDescriptions.loyalty.earn-points.steps.add-points
```

## Related rules

- [spec-action-stepId-defined](./spec-action-stepId-defined.md)
- [spec-sourceDescriptions-defined](./spec-sourceDescriptions-defined.md)
- [stepId-unique](./stepId-unique.md)
- [workflow-dependsOn](./workflow-dependsOn.md)

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/arazzo/spec-step-dependsOn-defined.ts)
- [Step Object](https://spec.openapis.org/arazzo/latest.html#step-object) in the Arazzo specification
