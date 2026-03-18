---
slug: /docs/cli/rules/oas/no-mixed-maximum-and-exclusive-maximum
---

# no-mixed-maximum-and-exclusive-maximum

Ensures that schemas do not use both `maximum` and `exclusiveMaximum` (or both `minimum` and `exclusiveMinimum`) at the same time.

| OAS | Compatibility |
| --- | ------------- |
| 2.0 | ❌            |
| 3.0 | ❌            |
| 3.1 | ✅            |

In OAS 3.1, `exclusiveMaximum` and `exclusiveMinimum` changed from booleans to numbers (aligning with JSON Schema draft 2020-12). This means a schema can accidentally specify both `maximum: 10` and `exclusiveMaximum: 10`, creating conflicting constraints.

The default setting for this rule (in the built-in `recommended` configuration) is `warn`.

## API design principles

When both `maximum` and `exclusiveMaximum` are present on the same schema, the intent is ambiguous. Is the upper bound inclusive or exclusive? Pick one:

- Use `maximum` for an inclusive upper bound (value <= N).
- Use `exclusiveMaximum` for an exclusive upper bound (value < N).

The same applies to `minimum` and `exclusiveMinimum`.

## Configuration

To configure the rule, add it to the `rules` object in your configuration file.
Set the desired [severity](../../rules.md#severity-settings) for the rule.

```yaml
rules:
  no-mixed-maximum-and-exclusive-maximum: error
```

| Option   | Type   | Description                                                                               |
| -------- | ------ | ----------------------------------------------------------------------------------------- |
| severity | string | Possible values: `off`, `warn`, `error`. Default `warn` (in `recommended` configuration). |

An example configuration:

```yaml
rules:
  no-mixed-maximum-and-exclusive-maximum: error
```

## Examples

Given this configuration:

```yaml
rules:
  no-mixed-maximum-and-exclusive-maximum: error
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

- [spec](./spec.md)
- [no-invalid-schema-examples](./no-invalid-schema-examples.md)

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/oas3/no-mixed-maximum-and-exclusive-maximum.ts)
- [JSON Schema draft 2020-12 - exclusiveMaximum](https://json-schema.org/draft/2020-12/json-schema-validation#section-6.2.3)
