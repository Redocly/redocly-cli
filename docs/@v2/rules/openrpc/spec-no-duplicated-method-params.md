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

## Examples

Given this configuration:

```yaml
rules:
  spec-no-duplicated-method-params: error
```

Example of an **incorrect** method, with two parameters named `id`:

```yaml
openrpc: 1.3.2
info:
  title: Pet store
  version: 1.0.0
methods:
  - name: get_pet
    params:
      - name: id
        schema:
          type: string
      - name: id
        schema:
          type: integer
    result:
      name: pet
      schema:
        type: object
```

Example of a **correct** method:

```yaml
openrpc: 1.3.2
info:
  title: Pet store
  version: 1.0.0
methods:
  - name: get_pet
    params:
      - name: id
        schema:
          type: string
      - name: include_owner
        schema:
          type: boolean
    result:
      name: pet
      schema:
        type: object
```

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/openrpc/spec-no-duplicated-method-params.ts)
