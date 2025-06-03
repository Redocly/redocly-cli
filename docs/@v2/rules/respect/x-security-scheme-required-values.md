---
slug: /docs/cli/rules/respect/x-security-schema-required-values
---

# x-security-schema-required-values

Validate that `x-security` has all required `values` described according to the used `scheme`.

| Arazzo | Compatibility |
| ------ | ------------- |
| 1.x    | ✅            |

## API design principles

This is a Respect specific rule.
Different OpenAPI `securitySchemes` have some required values, like `token` or `username`.

## Configuration

| Option   | Type   | Description                                              |
| -------- | ------ | -------------------------------------------------------- |
| severity | string | Possible values: `off`, `warn`, `error`. Default: `off`. |

An example configuration:

```yaml
arazzoRules:
  x-security-schema-required-values: error
```

## Examples

Given the following configuration:

```yaml
arazzoRules:
  x-security-schema-required-values: error
```

Example of an entry:

```yaml
- stepId: step-without-openapi-operation-and-security-scheme-name
  x-operation:
    method: GET
    url: 'https://api.example.com/v1/users'
  x-security:
    - scheme:
        type: http
        scheme: basic
      values:
        username: test@example.com
        password: 123456
```

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/respect/x-security-schema-required-values.ts)
