---
slug: /docs/cli/v1/rules/arazzo/struct
---

# struct

Ensures that your API document conforms to the [OpenAPI specification](https://spec.openapis.org/arazzo/latest.html#arazzo-specification).

| Arzzo | Compatibility |
| ----- | ------------- |
| 1.x   | ✅            |

The default setting for this rule (in the `recommended` and `minimal` configuration) is `error`.

This is an essential rule. Do not turned it off, except in rare and special cases.

## Configuration

| Option   | Type   | Description                                                                                |
| -------- | ------ | ------------------------------------------------------------------------------------------ |
| severity | string | Possible values: `off`, `warn`, `error`. Default `error` (in `recommended` configuration). |

An example configuration:

```yaml
rules:
  struct: error
```
