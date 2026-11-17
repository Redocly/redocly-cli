# spec-sourceDescriptions-defined

Requires a `$sourceDescriptions.<name>` reference to use the `name` of a source description defined in `sourceDescriptions`.

| Arazzo | Compatibility |
| ------ | ------------- |
| 1.x    | ✅            |

## Design principles

A step points to an operation or a workflow of a source description with a runtime expression, such as `$sourceDescriptions.<name>.<operationId>`.
The Arazzo specification requires the referenced operation or workflow to exist in one of the `sourceDescriptions`.
A reference with a name that is not in the `sourceDescriptions` list cannot be resolved, so the step cannot run.

This rule reports such a reference in the following fields:

- `operationId`, `operationPath`, and `workflowId` of a step.
- `workflowId` of a success or a failure action.
- `channelPath` and `dependsOn` of a step (Arazzo 1.1).

The rule checks only the name of the source description.
It does not check that the operation or the workflow exists in that source description.
The [workflow-dependsOn](./workflow-dependsOn.md) rule checks the references in the `dependsOn` list of a workflow.

## Configuration

| Option   | Type   | Description                                                                                |
| -------- | ------ | ------------------------------------------------------------------------------------------ |
| severity | string | Possible values: `off`, `warn`, `error`. Default `error` (in `recommended` configuration). |

An example configuration:

```yaml
rules:
  spec-sourceDescriptions-defined: error
```

## Examples

Given the following configuration:

```yaml
rules:
  spec-sourceDescriptions-defined: error
```

Example of an **incorrect** reference to a source description that is not defined:

```yaml Incorrect example
sourceDescriptions:
  - name: cafe-api
    type: openapi
    url: cafe.yaml
workflows:
  - workflowId: place-order
    steps:
      - stepId: list-menu-items
        operationId: $sourceDescriptions.bakery-api.listMenuItems
```

Example of a **correct** reference to a defined source description:

```yaml Correct example
sourceDescriptions:
  - name: cafe-api
    type: openapi
    url: cafe.yaml
workflows:
  - workflowId: place-order
    steps:
      - stepId: list-menu-items
        operationId: $sourceDescriptions.cafe-api.listMenuItems
```

## Related rules

- [sourceDescription-name-unique](./sourceDescription-name-unique.md)
- [sourceDescriptions-not-empty](./sourceDescriptions-not-empty.md)
- [workflow-dependsOn](./workflow-dependsOn.md)

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/arazzo/spec-sourceDescriptions-defined.ts)
