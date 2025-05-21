---
slug: /docs/cli/rules/respect/no-x-security-scheme-name-without-openapi
---

# no-x-security-scheme-name-without-openapi

You can only use `schemeNAme` in `x-security` when the Step request doesn't include `x-operation`.


| Arazzo | Compatibility |
| ------ | ------------- |
| 1.x    | ✅            |

## API design principles

This is a Respect specific rule.
You must use an OpenAPI operation in a Step to be able to reference `schemeName` inside `x-security` extension.

## Configuration

| Option   | Type   | Description                                             |
| -------- | ------ | ------------------------------------------------------- |
| severity | string | Possible values: `off`, `warn`, `error`. Default: `off`. |

An example configuration:

```yaml
arazzoRules:
  no-x-security-scheme-name-without-openapi: error
```

## Examples

Given the following configuration:

```yaml
arazzoRules:
  no-x-security-scheme-name-without-openapi: error
```

Example of an entry:

```yaml
- stepId: step-without-openapi-operation-and-security-scheme-name
  x-operation:
    method: GET
    url: https://api.example.com/v1/users
  x-security:
    - scheme:
        type: http
        scheme: basic
      values:
        username: test@example.com
        password: 123456
```

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/respect/no-x-security-scheme-name-without-openapi.ts)
