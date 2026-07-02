---
slug: /docs/cli/rules/openrpc/spec-no-required-params-after-optional
---

# spec-no-required-params-after-optional

Required parameters must appear before any optional parameters in each method's `params` list.

| Open-RPC | Compatibility |
| -------- | ------------- |
| 1.x      | ✅            |

## API design principles

Placing required parameters after optional ones matches common RPC and Open-RPC conventions and avoids ambiguous positional calling patterns.

## Configuration

| Option   | Type   | Description                                                                          |
| -------- | ------ | ------------------------------------------------------------------------------------ |
| severity | string | Possible values: `off`, `warn`, `error`. Default `error` (in `recommended` ruleset). |

```yaml
rules:
  spec-no-required-params-after-optional: error
```

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/openrpc/spec-no-required-params-after-optional.ts)
