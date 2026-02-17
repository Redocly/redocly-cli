---
slug: /docs/cli/rules/oas/spec-querystring-parameters
---

# spec-querystring-parameters

Enforces valid use of `querystring` parameters.

| OAS | Compatibility |
| --- | ------------- |
| 2.0 | ❌            |
| 3.0 | ❌            |
| 3.1 | ❌            |
| 3.2 | ✅            |

## API design principles

OpenAPI 3.2 introduces the `querystring` parameter location for representing the full query string as a single schema (e.g. `application/x-www-form-urlencoded`).

This rule ensures that:

- There is at most one `querystring` parameter.
  Parameters with `in: querystring` may be defined only once per path/operation parameter set.
- No mixing `querystring` with `query`.
  Parameters with `in: query` cannot be used together with `in: querystring` in the same operation/path parameter set.

## Configuration

| Option   | Type   | Description                                                                                |
| -------- | ------ | ------------------------------------------------------------------------------------------ |
| severity | string | Possible values: `off`, `warn`, `error`. Default `error` (in `recommended` configuration). |

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
  /events:
    get:
      summary: List events
      parameters:
        - name: timezone
          in: query
          schema:
            type: string
            default: UTC
        - name: criteria
          in: querystring
          content:
            application/x-www-form-urlencoded:
              schema:
                type: object
                properties:
                  startDate: { type: string, format: date }
                  endDate: { type: string, format: date }
                  status: { type: string, enum: [scheduled, cancelled, completed] }
```

Example of **incorrect** use (multiple `querystring` parameters):

```yaml
paths:
  /events:
    get:
      summary: List events
      parameters:
        - name: filters
          in: querystring
          content:
            application/x-www-form-urlencoded:
              schema:
                type: object
                properties:
                  startDate: { type: string, format: date }
                  status: { type: string }
        - name: pagination
          in: querystring
          content:
            application/x-www-form-urlencoded:
              schema:
                type: object
                properties:
                  limit: { type: integer }
                  offset: { type: integer }
```

Example of **correct** use (single `querystring` parameter, no `query`):

```yaml
paths:
  /events:
    get:
      summary: List events
      parameters:
        - name: params
          in: querystring
          content:
            application/x-www-form-urlencoded:
              schema:
                type: object
                properties:
                  startDate: { type: string, format: date }
                  endDate: { type: string, format: date }
                  status: { type: string, enum: [scheduled, cancelled, completed] }
                  limit: { type: integer, default: 20 }
                  offset: { type: integer, default: 0 }
```

## Related rules

- [operation-parameters-unique](./operation-parameters-unique.md)

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/oas3/spec-querystring-parameters.ts)
- [OpenAPI 3.2 Parameter object](https://spec.openapis.org/oas/3.2.0#parameter-object)
