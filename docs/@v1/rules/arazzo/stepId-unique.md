# stepId-unique

Requires the `stepId` to be unique amongst all steps described in the workflow.

| Arazzo | Compatibility |
| ------ | ------------- |
| 1.x    | ✅            |

## Design principles

The steps in a workflow each have a required `stepId` field and this must be unique in order to conform with the specification.
This rule catches any accidental duplication of `stepId` values so that the workflow is valid.

Note: `stepId` values are considered to be case-sensitive.

## Configuration

| Option   | Type   | Description                                             |
| -------- | ------ | ------------------------------------------------------- |
| severity | string | Possible values: `off`, `warn`, `error`. Default `off`. |

An example configuration:

```yaml
rules:
  stepId-unique: error
```

## Examples

Given the following configuration:

```yaml
rules:
  stepId-unique: error
```

Example of a **correct** `stepId`:

```yaml Correct example
workflows:
  - workflowId: get-museum-hours-2
    description: This workflow demonstrates how to get the museum opening hours and buy tickets.
    steps:
      - stepId: get-museum-hours
        operationId: museum-api.getMuseumHours
        successCriteria:
          - condition: $statusCode == 200
      - stepId: another-step-id
        operationId: museum-api.getMuseumHours
        successCriteria:
          - condition: $statusCode == 200
```

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/arazzo/stepId-unique.ts)
