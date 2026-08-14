---
slug: /docs/cli/rules/common/no-duplicated-enum-values
---

# no-duplicated-enum-values

Requires all values in an `enum` to be unique.

| OAS | Compatibility |
| --- | ------------- |
| 2.0 | ✅            |
| 3.0 | ✅            |
| 3.1 | ✅            |
| 3.2 | ✅            |

| AsyncAPI | Compatibility |
| -------- | ------------- |
| 2.6      | ✅            |
| 3.0      | ✅            |

| Arazzo | Compatibility |
| ------ | ------------- |
| 1.0    | ✅            |

## API design principles

A duplicated value in an `enum` is always a mistake:
it adds noise for readers, and some tools reject such schemas because JSON Schema requires `enum` values to be unique.
This rule catches copy-paste errors early in your API definition.

## Configuration

| Option   | Type   | Description                                                                                  |
| -------- | ------ | -------------------------------------------------------------------------------------------- |
| severity | string | Possible values: `off`, `warn`, `error`. Default is `warn` in the recommended configuration. |

Example configuration:

```yaml
rules:
  no-duplicated-enum-values: error
```

## Examples

Example of **incorrect** enum values (duplicated value `red`):

```yaml
schemas:
  Color:
    type: string
    enum:
      - red
      - green
      - red
```

Example of **correct** enum values (all values are unique):

```yaml
schemas:
  Color:
    type: string
    enum:
      - red
      - green
```

## Related rules

- [no-enum-type-mismatch](./no-enum-type-mismatch.md)

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/common/no-duplicated-enum-values.ts)
