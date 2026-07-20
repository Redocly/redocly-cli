---
slug: /docs/cli/rules/common/security-scopes-defined
---

# security-scopes-defined

Requires that every scope used in a security requirement is defined in the corresponding OAuth2 security scheme.

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

The rule checks security schemes of type `oauth2`, where the set of valid scopes is declared in the API description:

- **OpenAPI 3.x and AsyncAPI 2.6**: scopes used in security requirements must be declared in the `scopes` of at least one of the scheme's `flows`.
- **OpenAPI 2.0**: scopes used in security requirements must be declared in the `scopes` of the scheme.
- **AsyncAPI 3.0**: scopes listed in the `scopes` of a security scheme must be declared in the `availableScopes` of at least one of the scheme's `flows`.

Other scheme types are skipped: `openIdConnect` scopes are defined behind the discovery URL and can't be checked statically.
For the remaining types OpenAPI 3.1 and later allow arbitrary role names.
Requirements that reference undefined security schemes are skipped as well — those are reported by the [security-defined](../oas/security-defined.md) rule.

## API design principles

A scope that is used in a security requirement but not declared in the security scheme is almost always a typo or a leftover from a renamed scope.
Clients generated or configured from such a description request permissions that don't exist, and fail at authorization time.
This rule catches the mismatch early and suggests the closest declared scope.

## Configuration

| Option        | Type    | Description                                                                               |
| ------------- | ------- | ----------------------------------------------------------------------------------------- |
| severity      | string  | Possible values: `off`, `warn`, `error`. Default `warn` (in `recommended` configuration). |
| requireScopes | boolean | Requires every `oauth2` security requirement to list at least one scope. Default `false`. |

An example configuration:

```yaml
rules:
  security-scopes-defined:
    severity: error
    requireScopes: true
```

## Examples

Given this configuration:

```yaml
rules:
  security-scopes-defined: error
```

Example of an **incorrect** security requirement — the `read:pet` scope is not defined in the scheme:

```yaml
paths:
  /pets:
    get:
      security:
        - petstore_auth:
            - read:pet
components:
  securitySchemes:
    petstore_auth:
      type: oauth2
      flows:
        authorizationCode:
          authorizationUrl: https://example.com/authorize
          tokenUrl: https://example.com/token
          scopes:
            read:pets: Read pets
            write:pets: Write pets
```

Example of a **correct** security requirement:

```yaml
paths:
  /pets:
    get:
      security:
        - petstore_auth:
            - read:pets
components:
  securitySchemes:
    petstore_auth:
      type: oauth2
      flows:
        authorizationCode:
          authorizationUrl: https://example.com/authorize
          tokenUrl: https://example.com/token
          scopes:
            read:pets: Read pets
            write:pets: Write pets
```

## Related rules

- [security-defined](../oas/security-defined.md)
- [no-unused-components](../oas/no-unused-components.md)
- [configurable rules](../configurable-rules.md)

## Resources

- [Rule source for OpenAPI and AsyncAPI 2.6](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/common/security-scopes-defined.ts)
- [Rule source for AsyncAPI 3.0](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/async3/security-scopes-defined.ts)
- [Security scheme docs](https://redocly.com/docs/openapi-visual-reference/security-schemes/)
