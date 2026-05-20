# security-defined

Verifies that every security scheme referenced from an operation or server `security` array is defined in `components.securitySchemes`.

| AsyncAPI | Compatibility |
| -------- | ------------- |
| 2.6      | ✅            |
| 3.0      | ✅            |

## API design principles

In AsyncAPI 2.x, `security` entries on operations and servers are bare security scheme names that must match a key under `components.securitySchemes`.
A typo or rename breaks the reference but the document remains structurally valid.
The key mismatch is only visible to clients at runtime.

In AsyncAPI 3.0, `security` entries are `SecurityScheme` objects, typically expressed as `$ref`s into `components.securitySchemes`.

The `security-defined` rule reports when a security `$ref` does not point into `components.securitySchemes` or when it points at a name that is not defined there.
This rule catches these name mismatches at lint time.

## Configuration

| Option   | Type   | Description                                                                                |
| -------- | ------ | ------------------------------------------------------------------------------------------ |
| severity | string | Possible values: `off`, `warn`, `error`. Default `error` (in `recommended` configuration). |

An example configuration:

```yaml
rules:
  security-defined: error
```

## Examples

Given this configuration:

```yaml
rules:
  security-defined: error
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

Example of a **correct** AsyncAPI 2.x security definition:

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

Example of an **incorrect** AsyncAPI 3.0 security definition where the `$ref` points at an undefined scheme:

```yaml
asyncapi: '3.0.0'
operations:
  sendMessage:
    action: send
    channel:
      $ref: '#/channels/userSignedUp'
    security:
      - $ref: '#/components/securitySchemes/OAuth'
components:
  securitySchemes:
    JWT:
      type: http
      scheme: bearer
```

Example of a **correct** AsyncAPI 3.0 security definition:

```yaml
asyncapi: '3.0.0'
operations:
  sendMessage:
    action: send
    channel:
      $ref: '#/channels/userSignedUp'
    security:
      - $ref: '#/components/securitySchemes/JWT'
components:
  securitySchemes:
    JWT:
      type: http
      scheme: bearer
```

## Related rules

- [security-defined](../oas/security-defined.md) — equivalent rule for OpenAPI.

## Resources

- [AsyncAPI 2.x rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/async2/security-defined.ts)
- [AsyncAPI 3.0 rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/async3/security-defined.ts)
