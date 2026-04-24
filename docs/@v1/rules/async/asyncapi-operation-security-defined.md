# asyncapi-operation-security-defined

Verifies that every security scheme referenced from an operation or server `security` array is defined in `components.securitySchemes`.

| AsyncAPI | Compatibility |
| -------- | ------------- |
| 2.6      | ✅            |
| 3.0      | N/A           |

## API design principles

In AsyncAPI 2.x, `security` entries on operations and servers are bare security scheme names that must match a key under `components.securitySchemes`.
A typo or rename leaves the reference dangling, and the document remains structurally valid — the mismatch is only visible to clients at runtime.

This rule catches those name mismatches at lint time.

In AsyncAPI 3.0 the `security` array contains scheme objects (typically `$ref`), so undefined references are already reported by the `no-unresolved-refs` rule. This rule is a no-op for AsyncAPI 3.0 documents.

## Configuration

| Option   | Type   | Description                                                                                |
| -------- | ------ | ------------------------------------------------------------------------------------------ |
| severity | string | Possible values: `off`, `warn`, `error`. Default `error` (in `recommended` configuration). |

An example configuration:

```yaml
rules:
  asyncapi-operation-security-defined: error
```

## Examples

Given this configuration:

```yaml
rules:
  asyncapi-operation-security-defined: error
```

Example of an **incorrect** security definition due to a mismatch between the referenced name and `components.securitySchemes`:

```yaml
asyncapi: '2.6.0'
channels:
  user/signedup:
    subscribe:
      security:
        - OAuth: [] # no matching scheme in components.securitySchemes
      message:
        messageId: UserSignedUp
components:
  securitySchemes:
    JWT:
      type: http
      scheme: bearer
```

Example of a **correct** security definition:

```yaml
asyncapi: '2.6.0'
channels:
  user/signedup:
    subscribe:
      security:
        - JWT: []
      message:
        messageId: UserSignedUp
components:
  securitySchemes:
    JWT:
      type: http
      scheme: bearer
```

## Related rules

- [security-defined](../oas/security-defined.md) — equivalent rule for OpenAPI.

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/async2/asyncapi-operation-security-defined.ts)
