---
slug: /docs/cli/v2/rules/oas/struct
---

# struct

Ensures that your API document conforms to the [OpenAPI specification](https://spec.openapis.org/oas/v3.1.0.html).

| OAS | Compatibility |
| --- | ------------- |
| 2.0 | ✅            |
| 3.0 | ✅            |
| 3.1 | ✅            |

The default setting for this rule (in the `recommended` and `minimal` configuration) is `error`.

This is an essential rule that should not be turned off except in rare and special cases.

## API design principles

It's important to conform to the specification so that tools work with your API document. Doing so makes writing and maintenance of API descriptions easier.

## Configuration

| Option   | Type   | Description                                                                                |
| -------- | ------ | ------------------------------------------------------------------------------------------ |
| severity | string | Possible values: `off`, `warn`, `error`. Default `error` (in `recommended` configuration). |

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
