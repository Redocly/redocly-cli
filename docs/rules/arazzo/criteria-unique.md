# criteria-unique

The criteria list must not contain duplicated assertions.

| Arazzo | Compatibility |
| ------ | ------------- |
| 1.0.0  | ✅            |

## API design principles

The criteria list must not contain duplicated assertions.

## Configuration

| Option   | Type   | Description                                             |
| -------- | ------ | ------------------------------------------------------- |
| severity | string | Possible values: `off`, `warn`, `error`. Default `off`. |

An example configuration:

```yaml
rules:
  criteria-unique: error
```

## Examples

Given the following configuration:

```yaml
rules:
  criteria-unique: error
```

Example of a criteria list:

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
