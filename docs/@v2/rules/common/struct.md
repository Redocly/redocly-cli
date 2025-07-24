---
slug: /docs/cli/rules/common/struct
---

# struct

Ensures that your API document conforms to structural requirements of [OpenAPI specification](https://spec.openapis.org/oas/v3.1.0.html), [AsyncAPI specification](https://www.asyncapi.com/docs/reference/specification/v3.0.0), [Arazzo specification](https://spec.openapis.org/arazzo/latest.html), or [Overlay specification](https://spec.openapis.org/overlay/latest.html).

| OAS | Compatibility |
| --- | ------------- |
| 2.0 | ✅            |
| 3.0 | ✅            |
| 3.1 | ✅            |

| AsyncAPI | Compatibility |
| -------- | ------------- |
| 2.6      | ✅            |
| 3.0      | ✅            |

| Arazzo | Compatibility |
| ------ | ------------- |
| 1.x    | ✅            |

| Overlay | Compatibility |
| ------- | ------------- |
| 1.x     | ✅            |

The default setting for this rule (in the `spec`, `recommended`, and `minimal` configuration) is `error`.

This is an essential rule that should not be turned off except in rare and special cases.

## API design principles

It's important to conform to the specification so that tools work with your API document. Doing so makes writing and maintenance of API descriptions easier.

## Configuration

| Option   | Type   | Description                                               |
| -------- | ------ | --------------------------------------------------------- |
| severity | string | Possible values: `off`, `warn`, `error`. Default `error`. |

An example configuration:

```yaml
rules:
  struct: error
```

## Examples

Given this configuration:

```yaml
rules:
  struct: error
```

Example of an **incorrect** struct:

```yaml
openapi: 3.0.0
info:
  version: 1.0.0
paths: {}
```

Example of a **correct** struct:

```yaml
openapi: 3.0.0
info:
  title: Ultra API
  version: 1.0.0
paths: {}
```

## Related rules

- [configurable rules](../configurable-rules.md)

## Resources

- [OpenAPI docs](https://redocly.com/learn/openapi/learning-openapi)
- [AsyncAPI specification](https://www.asyncapi.com/docs/reference/specification/v3.0.0)
- [Arazzo specification](https://spec.openapis.org/arazzo/latest.html)
- [Overlay specification](https://spec.openapis.org/overlay/latest.html)
