# parameters-unique

Requires unique values in the `parameters` lists.

| Arazzo | Compatibility |
| ------ | ------------- |
| 1.x    | ✅            |

## Design principles

A list of `parameters` that are applicable to a step or all the steps described in a workflow must not contain duplicates.
If duplicates are present, unexpected parameter overrides could cause problems.

This ruled checks parameter lists in the following locations:

- `workflows.[workflow].parameters`
- `workflows.[workflow].steps.[step].parameters`
- `x-parameters`

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
