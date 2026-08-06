---
slug: /docs/cli/rules/oas/spec-ref-siblings
---

# spec-ref-siblings

Checks that only specification-permitted properties are used next to a `$ref`.

| OAS | Compatibility |
| --- | ------------- |
| 2.0 | ✅            |
| 3.0 | ✅            |
| 3.1 | ✅            |
| 3.2 | ✅            |

| AsyncAPI | Compatibility |
| -------- | ------------- |
| 2.6      | ✅            |
| 3.0      | ✅            |

| Open-RPC | Compatibility |
| -------- | ------------- |
| 1.x      | ✅            |

## API design principles

OpenAPI 3.1 treats `$ref` differently depending on where it appears:

- In a **Schema Object** keywords next to `$ref` take effect.
  All siblings are allowed.
- A **Reference Object** `$ref` cannot be extended.
  Only `summary` and `description` are allowed alongside `$ref`.

OAS 2.0 and OAS 3.0 predate JSON Schema 2020-12 and allow only the `$ref` itself.
AsyncAPI and Open-RPC also allow only the `$ref` itself.

A Path Item Object is the exception: every OpenAPI version lists `$ref` among its own fields, so a Path Item keeps its siblings and the rule does not report them.

## Configuration

To configure the rule, add it to the `rules` object in your configuration file, and set the desired [severity](../../rules.md#severity-settings).

| Option   | Type   | Description                                                                               |
| -------- | ------ | ----------------------------------------------------------------------------------------- |
| severity | string | Possible values: `off`, `warn`, `error`. Default `warn` (in `recommended` configuration). |

An example configuration:

```yaml
rules:
  spec-ref-siblings: error
```

## Examples

Given the following configuration:

```yaml
rules:
  spec-ref-siblings: error
```

Example of **incorrect** siblings next to a Reference Object `$ref` (OAS 3.1), where neither `headers` nor the `x-internal` extension is allowed:

```yaml
responses:
  '200':
    $ref: '#/components/responses/Ok'
    x-internal: true
    headers:
      X-Rate-Limit:
        schema:
          type: integer
```

Example of **correct** siblings next to a Reference Object `$ref` (OAS 3.1), where only `summary` and `description` are allowed:

```yaml
responses:
  '200':
    $ref: '#/components/responses/Ok'
    description: overrides the referenced description
```

Example of **correct** siblings next to a Schema Object `$ref` (OAS 3.1), where JSON Schema 2020-12 keywords are allowed:

```yaml
schema:
  $ref: '#/components/schemas/Base'
  readOnly: true
  description: a read-only variant of Base
  x-internal: true
```

## Related rules

- [spec-strict-refs](spec-strict-refs.md)
- [struct](../common/struct.md)

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/oas3/spec-ref-siblings.ts)
- [Reference Object docs](https://spec.openapis.org/oas/v3.1.0.html#reference-object)
