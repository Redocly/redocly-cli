---
slug: /docs/cli/rules/openrpc/spec-no-duplicated-method-params
---

# spec-no-duplicated-method-params

Each method's `params` list must not contain more than one parameter with the same `name`.

| Open-RPC | Compatibility |
| -------- | ------------- |
| 1.x      | ✅            |

## API design principles

Duplicate parameter names make it unclear which definition applies and can break tooling that indexes parameters by name.

## Configuration

| Option   | Type   | Description                                                                          |
| -------- | ------ | ------------------------------------------------------------------------------------ |
| severity | string | Possible values: `off`, `warn`, `error`. Default `error` (in `recommended` ruleset). |

```yaml
rules:
  spec-no-duplicated-method-params: error
```

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/openrpc/spec-no-duplicated-method-params.ts)
