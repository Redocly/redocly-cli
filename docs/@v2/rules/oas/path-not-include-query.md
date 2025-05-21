---
slug: /docs/cli/v2/rules/oas/path-not-include-query
---

# path-not-include-query

Path should not include query parameters.
The query parameters should be defined on the `PathItem` or `Operation`.

| OAS | Compatibility |
| --- | ------------- |
| 2.0 | ✅            |
| 3.0 | ✅            |
| 3.1 | ✅            |

## API design principles

Don't put query string items in the path, they belong in parameters with `in: query`.
This rule is not opinionated.
Its root cause is inexperience with OpenAPI (no holy war here).

## Configuration

| Option   | Type   | Description                                                                              |
| -------- | ------ | ---------------------------------------------------------------------------------------- |
| severity | string | Possible values: `off`, `warn`, `error`. Default `off` (in `recommended` configuration). |

An example configuration:

```yaml
rules:
  path-not-include-query: error
```

## Examples

Given this configuration:

```yaml
rules:
  path-not-include-query: error
```

Example of an **incorrect** path:

```yaml
paths:
  /customers?id={id}:
    get:
      parameters:
        - name: id
          in: query
          required: true
```

Example of a **correct** path:

```yaml
paths:
  /customers/{id}:
    get:
      parameters:
        - name: id
          in: path
          required: true
          description: The customer's ID.
```

## Related rules

- [path-parameters-defined](./path-parameters-defined.md)
- [configurable rules](../configurable-rules.md)

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/common/parameter-description.ts)
- [Paths docs](https://redocly.com/docs/openapi-visual-reference/paths/)
- [Operation docs](https://redocly.com/docs/openapi-visual-reference/operation/)
