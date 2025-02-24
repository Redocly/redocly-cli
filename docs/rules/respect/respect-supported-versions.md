# respect-supported-versions

The `version` property must be one of the supported values.

| Arazzo | Compatibility |
| ------ | ------------- |
| 1.0.0  | ✅            |

## API design principles

This rule is used with Spot.
The `version` property must be one of the Spot-supported values which may be different from the latest `Arazzo` version.

## Configuration

| Option   | Type   | Description                                             |
| -------- | ------ | ------------------------------------------------------- |
| severity | string | Possible values: `off`, `warn`, `error`. Default `off`. |

An example configuration:

```yaml
arazzoRules:
  spot-supported-versions: error
```

## Examples

Given the following configuration:

```yaml
arazzoRules:
  spot-supported-versions: error
```

Example of a **correct** entry:

```yaml Object example
arazzo: 1.0.1
```

## Related rules

- [no-criteria-xpath](./no-criteria-xpath.md)

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/spot/spot-supported-versions.ts)
