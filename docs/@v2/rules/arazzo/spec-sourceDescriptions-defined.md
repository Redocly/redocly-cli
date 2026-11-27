# spec-sourceDescriptions-defined

Requires a `$sourceDescriptions.<name>` reference to use the `name` of a source description defined in `sourceDescriptions`.

| Arazzo | Compatibility |
| ------ | ------------- |
| 1.x    | ✅            |

## Design principles

A step points to an operation or a workflow of a source description with a runtime expression, such as `$sourceDescriptions.<name>.<workflowId>`.
The Arazzo specification requires the referenced operation or workflow to exist in one of the `sourceDescriptions`.
A reference with a name that is not in the `sourceDescriptions` list cannot be resolved, so the step cannot run.

The `spec-sourceDescriptions-defined` rule reports such a reference in the following fields:

- `operationPath` and `workflowId` of a step.
- `workflowId` of a success or a failure action.
- `channelPath` and `dependsOn` of a step (Arazzo 1.1).

The rule does not check the `workflowId` of an action with the `end` type, because the field is not relevant there.

The rule checks only the name of the source description.
It does not check that the operation or the workflow exists in that source description.
The `spec-step-operationId-resolved` rule checks the `operationId` of a step.
The [workflow-dependsOn](./workflow-dependsOn.md) rule checks the references in the `dependsOn` list of a workflow.
The [spec-step-dependsOn-defined](./spec-step-dependsOn-defined.md) rule checks the steps that the `dependsOn` list of a step references in the same document.

## Configuration

| Option   | Type   | Description                                                                                 |
| -------- | ------ | ------------------------------------------------------------------------------------------- |
| severity | string | Possible values: `off`, `warn`, `error`. Default: `error` (in `recommended` configuration). |

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
      - stepId: create-order
        operationPath: '{$sourceDescriptions.bakery-api.url}#/paths/~1orders/post'
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
      - stepId: create-order
        operationPath: '{$sourceDescriptions.cafe-api.url}#/paths/~1orders/post'
```

## Related rules

- [sourceDescription-name-unique](./sourceDescription-name-unique.md)
- [sourceDescriptions-not-empty](./sourceDescriptions-not-empty.md)
- [spec-step-dependsOn-defined](./spec-step-dependsOn-defined.md)
- [workflow-dependsOn](./workflow-dependsOn.md)

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/arazzo/spec-sourceDescriptions-defined.ts)
