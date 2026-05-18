# spec-parameters-in-by-context

Requires the `in` field on a parameter to be specified or omitted based on the parent context.

| Arazzo | Compatibility |
| ------ | ------------- |
| 1.x    | ✅            |

## Design principles

The Arazzo specification states that when a step, success action, or failure action specifies a `workflowId`, all parameters map to the referenced workflow's inputs and the `in` field MUST NOT be specified.
In every other case (for example, when a step specifies an `operationId`, `operationPath`, or `x-operation`), the `in` field MUST be specified on each parameter.

This rule additionally enforces that success and failure action `parameters` are only valid when the action references a `workflowId`.

## Configuration

| Option   | Type   | Description                                             |
| -------- | ------ | ------------------------------------------------------- |
| severity | string | Possible values: `off`, `warn`, `error`. Default `off`. |

An example configuration:

```yaml
rules:
  spec-parameters-in-by-context: error
```

## Examples

Given the following configuration:

```yaml
rules:
  spec-parameters-in-by-context: error
```

Example of a **correct** step referencing an `operationId` (each parameter declares `in`):

```yaml Correct example - operationId
workflows:
  - workflowId: get-museum-hours
    steps:
      - stepId: list-hours
        operationId: listMuseumHours
        parameters:
          - in: query
            name: startDate
            value: '2024-01-01'
```

Example of a **correct** step referencing a `workflowId` (parameters map to workflow inputs, no `in` field):

```yaml Correct example - workflowId
workflows:
  - workflowId: buy-tickets
    steps:
      - stepId: reuse-hours-workflow
        workflowId: get-museum-hours
        parameters:
          - name: startDate
            value: '2024-01-01'
```

Example of a **correct** success action transferring to another workflow with mapped parameters:

```yaml Correct example - success action
workflows:
  - workflowId: buy-tickets
    steps:
      - stepId: purchase
        operationId: createTicket
        onSuccess:
          - name: continue-to-hours
            type: goto
            workflowId: get-museum-hours
            parameters:
              - name: startDate
                value: '2024-01-01'
```

Example of an **incorrect** step referencing a `workflowId` while declaring `in` on a parameter:

```yaml Incorrect example - workflowId with `in`
workflows:
  - workflowId: buy-tickets
    steps:
      - stepId: reuse-hours-workflow
        workflowId: get-museum-hours
        parameters:
          - in: query
            name: startDate
            value: '2024-01-01'
```

Example of an **incorrect** step referencing an `operationId` while omitting `in`:

```yaml Incorrect example - operationId without `in`
workflows:
  - workflowId: get-museum-hours
    steps:
      - stepId: list-hours
        operationId: listMuseumHours
        parameters:
          - name: startDate
            value: '2024-01-01'
```

Example of an **incorrect** success action defining `parameters` without referencing a `workflowId`:

```yaml Incorrect example - action without workflowId
workflows:
  - workflowId: buy-tickets
    steps:
      - stepId: purchase
        operationId: createTicket
        onSuccess:
          - name: end-with-params
            type: end
            parameters:
              - name: startDate
                value: '2024-01-01'
```

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/arazzo/spec-parameters-in-by-context.ts)
