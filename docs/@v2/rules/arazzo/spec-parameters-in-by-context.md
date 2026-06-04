# spec-parameters-in-by-context

Validates how the `in` field is used on parameters based on the parent context.

| Arazzo | Compatibility |
| ------ | ------------- |
| 1.x    | ✅            |

## Design principles

The `in` field on an Arazzo parameter is not a required property — omitting it carries semantics.
When a step references a `workflowId`, a parameter with no `in` field is mapped to the referenced workflow's inputs.
When `in` is specified, the parameter is sent at that request location (`header`, `query`, `path`, or `cookie`) against the targeted operation.

This rule enforces the following:

- For a step that does not reference a `workflowId` (for example, one using `operationId`, `operationPath`, or `x-operation`), and for parameters defined at the workflow level, `in` must be specified on each inline parameter.
- Parameters on success and failure actions are only valid when the action references a `workflowId` — these parameters map to the referenced workflow's inputs and the spec states that `in` MUST NOT be used on them (see the [Success Action Object](https://spec.openapis.org/arazzo/latest.html#success-action-object) and [Failure Action Object](https://spec.openapis.org/arazzo/latest.html#failure-action-object)).

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

```yaml
# Correct example - operationId
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

Example of a **correct** step referencing a `workflowId` (parameters omit `in` and are mapped to the referenced workflow's inputs):

```yaml
# Correct example - workflowId
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

```yaml
# Correct example - success action
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

Example of an **incorrect** step referencing an `operationId` while omitting `in`:

```yaml
# Incorrect example - operationId without `in`
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

```yaml
# Incorrect example - action without workflowId
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
