---
slug: /docs/cli/rules/respect/x-allow-reserved
---

# x-allowReserved

Respect supports the `x-allowReserved` extension on **step parameters** in Arazzo descriptions.

Use `x-allowReserved` when a step passes a **query parameter** whose value must keep RFC 3986 reserved characters unencoded in the request URL.

| Arazzo | Compatibility |
| ------ | ------------- |
| 1.x    | ✅            |

## When to use it

- You have a query parameter whose value contains reserved characters: `: / ? # [ ] @ ! $ & ' ( ) * + , ; =`
- You need that value sent as-is in the query string (e.g. a full URL or a value that already uses reserved chars).
- Without `x-allowReserved`, Respect encodes those characters (e.g. `:` → `%3A`).

This matches the OpenAPI 3 [Parameter.allowReserved](https://spec.openapis.org/oas/v3.0.3#parameter-object) behavior. When a step uses an OpenAPI operation, Respect also honors `allowReserved` from the operation’s parameters; for steps that define parameters directly in Arazzo (e.g. with `x-operation`), use the `x-allowReserved` extension.

## Example

```yaml
workflows:
  - workflowId: example
    steps:
      - stepId: get-with-filter
        x-operation:
          url: https://api.example.com/search
          method: get
        parameters:
          - in: query
            name: filter
            value: "https://example.com/path/to;x,y(z)a*b.c[1]@v"
            x-allowReserved: true
        successCriteria:
          - condition: $statusCode == 200
```

With `x-allowReserved: true`, the query string is sent as:

`?filter=https://example.com/path/to;x,y(z)a*b.c[1]@v`

Reserved characters in the value are left unencoded.

## Related

- OpenAPI 3 [Parameter object](https://spec.openapis.org/oas/v3.0.3#parameter-object) (`allowReserved`)
