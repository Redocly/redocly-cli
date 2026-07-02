---
slug: /docs/cli/rules/oas/path-http-verbs-order
---

# path-http-verbs-order

Requires HTTP operations on each path item to appear in a consistent order.

| OAS | Compatibility |
| --- | ------------- |
| 2.0 | ✅            |
| 3.0 | ✅            |
| 3.1 | ✅            |
| 3.2 | ✅            |

## API design principles

Keeping verbs in a predictable order (for example `get` before `post`) makes specs easier to scan and aligns with common style guides.

## Configuration

| Option   | Type     | Description                                                                                                                                                                    |
| -------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| severity | string   | Possible values: `off`, `warn`, `error`. Default `off` (in `recommended` and `minimal` configurations).                                                                        |
| order    | string[] | Ordered list of allowed HTTP method names. Operations on a path must follow this order. Default: `get`, `head`, `post`, `put`, `patch`, `delete`, `options`, `query`, `trace`. |

An example configuration:

```yaml
rules:
  path-http-verbs-order: error
```

Custom order:

```yaml
rules:
  path-http-verbs-order:
    severity: error
    order:
      - get
      - post
      - put
      - patch
      - delete
```

## Examples

With `path-http-verbs-order: error`, declaring `post` before `get` on the same path is reported because the default order expects `get` first.

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/common/path-http-verbs-order.ts)
