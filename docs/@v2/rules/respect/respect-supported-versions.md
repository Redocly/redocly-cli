# respect-supported-versions

The `version` property must be one of the supported values.

| Arazzo | Compatibility |
| ------ | ------------- |
| 1.x    | ✅            |

## API design principles

This rule is used with Respect.
The `version` property must be one of the Respect-supported values which may be different from the latest `Arazzo` version.

## Configuration

| Option   | Type   | Description                                             |
| -------- | ------ | ------------------------------------------------------- |
| severity | string | Possible values: `off`, `warn`, `error`. Default `off`. |

An example configuration:

```yaml
rules:
  respect-supported-versions: error
```

## Examples

Given the following configuration:

```yaml
rules:
  respect-supported-versions: error
```

Example of a **correct** entry:

```yaml Object example
arazzo: 1.0.1
```

## Related rules

- [no-criteria-xpath](./no-criteria-xpath.md)
- [no-x-security-scheme-name-without-openapi](./no-x-security-scheme-name-without-openapi.md)
- [x-security-scheme-required-values](./x-security-scheme-required-values.md)
- [no-x-security-scheme-name-in-workflow](./no-x-security-scheme-name-in-workflow.md)

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/respect/respect-supported-versions.ts)
