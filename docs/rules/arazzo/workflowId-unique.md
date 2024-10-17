# workflowId-unique

Requires the `workflowId` property to be unique across all workflows.

| Arazzo | Compatibility |
| ------ | ------------- |
| 1.0.0  | ✅            |

## API design principles

The `workflowId` is a string that represents the workflow.
According to the spec, the `workflowId` must be unique across all workflows described in the API definition.

## Configuration

| Option   | Type   | Description                                             |
| -------- | ------ | ------------------------------------------------------- |
| severity | string | Possible values: `off`, `warn`, `error`. Default `off`. |

An example configuration:

```yaml
rules:
  workflowId-unique: error
```

## Examples

Given the following configuration:

```yaml
rules:
  workflowId-unique: error
```

Example of an **incorrect** `workflows` list:

```yaml Incorrect example
workflows:
  - workflowId: get-museum-hours
    steps:
      - stepId: get-museum-hours
        operationId: museum-api.getMuseumHours
        successCriteria:
          - condition: $statusCode == 200
  - workflowId: get-museum-hours
    steps:
      - stepId: get-museum-hours
        operationId: museum-api.getMuseumHours
        successCriteria:
          - condition: $statusCode == 200
```

Example of a **correct** `workflows` list:

```yaml Correct example
workflows:
  - workflowId: get-museum-hours
    steps:
      - stepId: get-museum-hours
        operationId: museum-api.getMuseumHours
        successCriteria:
          - condition: $statusCode == 200
  - workflowId: get-museum-hours-routine
    steps:
      - stepId: get-museum-hours
        operationId: museum-api.getMuseumHours
        successCriteria:
          - condition: $statusCode == 200
```

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/arazzo/workflowId-unique.ts)
