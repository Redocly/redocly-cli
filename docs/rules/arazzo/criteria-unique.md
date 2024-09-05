---
slug: /docs/cli/rules/arazzo/criteria-unique
---

# criteria-unique

The criteria list should not contain duplicated assertions.

| Arazzo | Compatibility |
| ------ | ------------- |
| 1.0.0  | ✅            |

## API design principles

The criteria list should not contain duplicated assertions.

## Configuration

| Option   | Type   | Description                                             |
| -------- | ------ | ------------------------------------------------------- |
| severity | string | Possible values: `off`, `warn`, `error`. Default `off`. |

An example configuration:

```yaml
arazzoRules:
  criteria-unique: error
```

## Examples

Given the following configuration:

```yaml
arazzoRules:
  criteria-unique: error
```

Example of an **incorrect** criteria:

```yaml Object example
successCriteria:
  - condition: $statusCode == 200
  - condition: $statusCode == 200
onSuccess:
  - name: 'onSuccessActionName'
    type: 'goto'
    stepId: 'buy-ticket'
    criteria:
      - condition: $response.body.open == true
      - condition: $response.body.open == true
onFailure:
  - name: 'onFailureActionName'
    type: 'goto'
    stepId: 'buy-ticket'
    criteria:
      - condition: $response.body.open == true
      - condition: $response.body.open == true
```

Example of a **correct** criteria:

```yaml Object example
successCriteria:
  - condition: $statusCode == 200
onSuccess:
  - name: 'onSuccessActionName'
    type: 'goto'
    stepId: 'buy-ticket'
    criteria:
      - condition: $response.body.open == true
onFailure:
  - name: 'onFailureActionName'
    type: 'goto'
    stepId: 'buy-ticket'
    criteria:
      - condition: $response.body.open == true
```

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/arazzo/criteria-unique.ts)
