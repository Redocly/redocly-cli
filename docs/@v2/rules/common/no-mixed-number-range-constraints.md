---
slug: /docs/cli/rules/common/no-mixed-number-range-constraints
---

# no-mixed-number-range-constraints

Ensures that schemas do not use both `maximum` and `exclusiveMaximum` (or both `minimum` and `exclusiveMinimum`) at the same time.

| OAS | Compatibility |
| --- | ------------- |
| 2.0 | ❌            |
| 3.0 | ❌            |
| 3.1 | ✅            |
| 3.2 | ✅            |

| AsyncAPI | Compatibility |
| -------- | ------------- |
| 2.6      | ✅            |
| 3.0      | ✅            |

| Arazzo | Compatibility |
| ------ | ------------- |
| 1.0    | ✅            |

In OpenAPI Specification version 3.1, `exclusiveMaximum` and `exclusiveMinimum` changed from booleans to numbers (aligning with JSON Schema draft 2020-12). This means a schema can accidentally specify both `maximum: 10` and `exclusiveMaximum: 10`, creating conflicting constraints.

The default setting for this rule (in the built-in `recommended` configuration) is `warn`.

## API design principles

When both `maximum` and `exclusiveMaximum` are present on the same schema, the intent is ambiguous.
Is the upper bound inclusive or exclusive?
Pick one:

- Use `maximum` for an inclusive upper bound (value <= N).
- Use `exclusiveMaximum` for an exclusive upper bound (value < N).

The same applies to `minimum` and `exclusiveMinimum`.

## Configuration

To configure the rule, add it to the `rules` object in your configuration file.
Set the desired [severity](../../rules.md#severity-settings) for the rule.

```yaml
rules:
  no-mixed-number-range-constraints: error
```

| Option   | Type   | Description                                                                               |
| -------- | ------ | ----------------------------------------------------------------------------------------- |
| severity | string | Possible values: `off`, `warn`, `error`. Default `warn` (in `recommended` configuration). |

An example configuration:

```yaml
rules:
  no-mixed-number-range-constraints: error
```

## Examples

Given this configuration:

```yaml
rules:
  no-mixed-number-range-constraints: error
```

Example of an **incorrect** schema:

```yaml
type: integer
minimum: 0
maximum: 100
exclusiveMaximum: 100
```

Example of a **correct** schema (inclusive upper bound):

```yaml
type: integer
minimum: 0
maximum: 100
```

Example of a **correct** schema (exclusive upper bound):

```yaml
type: integer
minimum: 0
exclusiveMaximum: 100
```

## Related rules

- [no-schema-type-mismatch](./no-schema-type-mismatch.md)
- [no-enum-type-mismatch](./no-enum-type-mismatch.md)
- [no-required-schema-properties-undefined](./no-required-schema-properties-undefined.md)

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/common/no-mixed-number-range-constraints.ts)
- [JSON Schema draft 2020-12 - exclusiveMaximum](https://json-schema.org/draft/2020-12/json-schema-validation#section-6.2.3)
