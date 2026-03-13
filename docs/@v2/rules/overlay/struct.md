---
slug: /docs/cli/v1/rules/overlay/struct
---

# struct

Ensures that your API document conforms to the [Overlay specification](https://spec.openapis.org/overlay/latest.html#Overlay-specification).

| Overlay | Compatibility |
| ------- | ------------- |
| 1.x     | ✅            |

The default setting for this rule (in the `recommended` and `minimal` configuration) is `error`.

This is an essential rule. Do not turn it off, except in rare and special cases.

## Configuration

| Option   | Type   | Description                                                                                |
| -------- | ------ | ------------------------------------------------------------------------------------------ |
| severity | string | Possible values: `off`, `warn`, `error`. Default `error` (in `recommended` configuration). |

An example configuration:

```yaml
rules:
  struct: error
```
