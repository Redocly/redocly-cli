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

## Examples

Given this configuration:

```yaml
rules:
  spec-no-required-params-after-optional: error
```

Example of an **incorrect** method, with the required `owner_id` after the optional `limit`:

```yaml
openrpc: 1.3.2
info:
  title: Pet store
  version: 1.0.0
methods:
  - name: list_pets
    params:
      - name: limit
        schema:
          type: integer
      - name: owner_id
        required: true
        schema:
          type: string
    result:
      name: pets
      schema:
        type: array
```

Example of a **correct** method:

```yaml
openrpc: 1.3.2
info:
  title: Pet store
  version: 1.0.0
methods:
  - name: list_pets
    params:
      - name: owner_id
        required: true
        schema:
          type: string
      - name: limit
        schema:
          type: integer
    result:
      name: pets
      schema:
        type: array
```

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/openrpc/spec-no-required-params-after-optional.ts)
