---
slug: /docs/cli/rules/oas/spec-querystring-parameters
---

# spec-querystring-parameters

Enforce valid use of parameters with `in: querystring` (OpenAPI 3.2).

| OAS | Compatibility |
| --- | ------------- |
| 2.0 | ❌            |
| 3.0 | ❌            |
| 3.1 | ❌            |
| 3.2 | ✅            |

## API design principles

OpenAPI 3.2 introduces the `querystring` parameter location for representing the full query string as a single schema (e.g. `application/x-www-form-urlencoded`). This rule ensures:

1. **At most one querystring parameter** — Parameters with `in: querystring` may be defined only once per path/operation parameter set.
2. **No mixing with query** — Parameters with `in: query` cannot be used together with `in: querystring` in the same operation/path parameter set.

## Configuration

| Option   | Type   | Description                                                                                       |
| -------- | ------ | ------------------------------------------------------------------------------------------------- |
| severity | string | Possible values: `off`, `warn`, `error`. Default `off` (3.0/3.1), `error` in `recommended` (3.2). |

An example configuration:

```yaml
rules:
  spec-querystring-parameters: error
```

## Examples

Given this configuration:

```yaml
rules:
  spec-querystring-parameters: error
```

Example of **incorrect** use (mixing `query` and `querystring`):

```yaml
paths:
  /search:
    get:
      parameters:
        - name: q
          in: query
          schema:
            type: string
        - name: advancedQuery
          in: querystring
          content:
            application/x-www-form-urlencoded:
              schema:
                type: object
```

Example of **incorrect** use (multiple `querystring` parameters):

```yaml
paths:
  /search:
    get:
      parameters:
        - name: qs1
          in: querystring
          content:
            application/x-www-form-urlencoded:
              schema:
                type: object
        - name: qs2
          in: querystring
          content:
            application/x-www-form-urlencoded:
              schema:
                type: object
```

Example of **correct** use (single `querystring` parameter, no `query`):

```yaml
paths:
  /search:
    get:
      parameters:
        - name: filter
          in: querystring
          content:
            application/x-www-form-urlencoded:
              schema:
                type: object
                properties:
                  q: { type: string }
                  page: { type: integer }
```

## Related rules

- [path-not-include-query](./path-not-include-query.md)
- [operation-parameters-unique](./operation-parameters-unique.md)
- [configurable rules](../configurable-rules.md)

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/oas3/spec-querystring-parameters.ts)
- [OpenAPI 3.2 Parameter object](https://spec.openapis.org/oas/3.2.0#parameter-object)
