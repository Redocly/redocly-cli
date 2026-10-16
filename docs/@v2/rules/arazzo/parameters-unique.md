# parameters-unique

Requires unique values in the `parameters` lists.

| Arazzo | Compatibility |
| ------ | ------------- |
| 1.x    | ✅            |

## Design principles

A list of `parameters` that are applicable to a step or all the steps described in a workflow must not contain duplicates.
If duplicates are present, unexpected parameter overrides could cause problems.

A parameter is identified by the combination of its `name` and `in` fields, so the same name in different locations, such as `path` and `query`, is not a duplicate.
A `reference` to `$components.parameters` counts as the parameter it points to.

This rule checks parameter lists in the following locations:

- `workflows.[workflow].parameters`
- `workflows.[workflow].steps.[step].parameters`
- `workflows.[workflow].steps.[step].onSuccess.[action].parameters` and `onFailure.[action].parameters` (Arazzo 1.1)
- `workflows.[workflow].successActions.[action].parameters` and `failureActions.[action].parameters` (Arazzo 1.1)
- `components.successActions.[action].parameters` and `components.failureActions.[action].parameters` (Arazzo 1.1)

## Configuration

| Option   | Type   | Description                                             |
| -------- | ------ | ------------------------------------------------------- |
| severity | string | Possible values: `off`, `warn`, `error`. Default `off`. |

An example configuration:

```yaml
rules:
  parameters-unique: error
```

## Examples

Given the following configuration:

```yaml
rules:
  parameters-unique: error
```

Example of an **incorrect** `parameters` list, where both references point to a parameter named `search`:

```yaml Incorrect example
workflows:
  - workflowId: search-tickets
    steps:
      - stepId: find-tickets
        workflowId: find-tickets
        parameters:
          - reference: $components.parameters.searchByName
          - reference: $components.parameters.searchByDate
components:
  parameters:
    searchByName:
      name: search
      value: tour
    searchByDate:
      name: search
      value: 2026-10-02
```

Example of a **correct** `parameters` list:

```yaml Correct example
workflows:
  - workflowId: get-museum-hours
    parameters:
      - in: header
        name: Authorization
        value: Basic Og==
      - in: header
        name: X-Forwarded-For
        value: 1.2.3.4
```

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/arazzo/parameters-unique.ts)
