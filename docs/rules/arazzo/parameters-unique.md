# parameters-unique

Requires unique values in the `parameters` lists.

| Arazzo | Compatibility |
| ------ | ------------- |
| 1.0.0  | ✅            |

## API design principles

A list of `parameters` that are applicable to a step or all the steps described in a workflow should not contain duplicates.
If duplicates are present, unexpected parameter overrides could cause problems.

Checks parameter lists in the following locations:

- `workflows.[workflow].parameters`
- `workflows.[workflow[.steps.[step].parameters`
- `x-parameters`

## Configuration

| Option   | Type   | Description                                             |
| -------- | ------ | ------------------------------------------------------- |
| severity | string | Possible values: `off`, `warn`, `error`. Default `off`. |

An example configuration:

```yaml
arazzoRules:
  parameters-unique: error
```

## Examples

Given the following configuration:

```yaml
arazzoRules:
  parameters-unique: error
```

Example of an **incorrect** parameters array:

```yaml Object example
workflows:
  - workflowId: get-museum-hours
    parameters:
      - in: header
        name: Authorization
        value: Main Og==
      - in: header
        name: Authorization
        value: Basic Og==
```

Example of a **correct** parameters array:

```yaml Object example
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
