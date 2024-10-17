# parameters-not-in-body

Requires the `in` section inside `parameters` must not contain a `body`.

| Arazzo | Compatibility |
| ------ | ------------- |
| 1.0.0  | ✅            |

## API design principles

This is rule is specific to the Spot tool.
`body` is not supported in the `in` section inside `parameters`.
This affects parameter lists in:

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
  parameters-not-in-body: error
```

## Examples

Given the following configuration:

```yaml
arazzoRules:
  parameters-not-in-body: error
```

Example of an **incorrect** list of `parameters`:

```yaml Object example
workflows:
  - workflowId: get-museum-hours
    parameters:
      - in: body
        name: Authorization
        value: Basic Og==
```

Example of a **correct** list of `parameters`:

```yaml Object example
workflows:
  - workflowId: get-museum-hours
    parameters:
      - in: header
        name: Authorization
        value: Basic Og==
```

## Related rules

- [version-enum](./version-enum.md)

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/spot/parameters-not-in-body.ts)
