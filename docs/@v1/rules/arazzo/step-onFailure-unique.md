# step-onFailure-unique

Requires all of the `onFailure` actions of the `step` object to be unique.

| Arazzo | Compatibility |
| ------ | ------------- |
| 1.x    | ✅            |

## Design principles

Each `onFailure` action should be unique to avoid confusion or unexpected results.
A duplicate could indicate a mistake, or cause unwanted side effects if not detected by this rule.

## Configuration

| Option   | Type   | Description                                             |
| -------- | ------ | ------------------------------------------------------- |
| severity | string | Possible values: `off`, `warn`, `error`. Default `off`. |

An example configuration:

```yaml
rules:
  step-onFailure-unique: error
```

## Examples

Given the following configuration:

```yaml
rules:
  step-onFailure-unique: error
```

Example of a **correct** `onFailure` list:

```yaml Correct example
workflows:
- workflowId: get-museum-hours
  description: This workflow demonstrates how to get the museum opening hours and buy tickets.
  steps:
    - stepId: get-museum-hours
      operationId: museum-api.getMuseumHours
      successCriteria:
        - condition: $statusCode == 200
      onFailure:
        - name: call-crud-events
          workflowId: events-crud
          type: goto
        - name: second-call-crud-events
          workflowId: events-crud
          type: goto
        - reference: $components.failureActions.notify
        - reference: $components.failureActions.report
```

## Related rules

- [step-onSuccess-unique](./step-onSuccess-unique.md)

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/arazzo/step-onFailure-unique.ts)
