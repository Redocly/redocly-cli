# version-enum

Requires the `version` property must be one of the supported values.

| Arazzo | Compatibility |
| ------ | ------------- |
| 1.0.0  | ✅            |

## API design principles

This rule is used with Spot.
The `version` property must be one of the Spot-supported values which may be different to the latest `Arazzo` version.

## Configuration

| Option   | Type   | Description                                             |
| -------- | ------ | ------------------------------------------------------- |
| severity | string | Possible values: `off`, `warn`, `error`. Default `off`. |

An example configuration:

```yaml
arazzoRules:
  version-enum: error
```

## Examples

Given the following configuration:

```yaml
arazzoRules:
  version-enum: error
```

Example of an **incorrect** entry:

```yaml Object example
arazzo: 4.2.0
```

Example of a **correct** entry:

```yaml Object example
arazzo: 1.0.0
```

## Related rules

- [parameters-not-in-body](./parameters-not-in-body.md)

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/spot/version-enum.ts)
