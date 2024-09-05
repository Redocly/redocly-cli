---
slug: /docs/cli/rules/spot/no-actions-type-end
---

# no-actions-type-end

The `end` type action is not supported by Spot.

| Arazzo | Compatibility |
| ------ | ------------- |
| 1.0.0  | ✅            |

## API design principles

This is `Spot` specific rule.
The `end` type action is not supported by Spot.

## Configuration

| Option   | Type   | Description                                             |
| -------- | ------ | ------------------------------------------------------- |
| severity | string | Possible values: `off`, `warn`, `error`. Default `off`. |

An example configuration:

```yaml
arazzoRules:
  no-actions-type-end: error
```

## Examples

Given the following configuration:

```yaml
arazzoRules:
  no-actions-type-end: error
```

Example of an **incorrect** action:

```yaml Object example
onSuccess:
  - name: 'onSuccessActionName'
    type: 'end'
    stepId: 'buy-ticket'
onFailure:
  - name: 'onFailureActionName'
    type: 'end'
    stepId: 'buy-ticket'
```

Example of a **correct** action:

```yaml Object example
onSuccess:
  - name: 'onSuccessActionName'
    type: 'goto'
    stepId: 'buy-ticket'
onFailure:
  - name: 'onFailureActionName'
    type: 'goto'
    stepId: 'buy-ticket'
```

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/spot/no-actions-type-end.ts)
