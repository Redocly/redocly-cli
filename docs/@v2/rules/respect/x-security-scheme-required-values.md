---
seo:
  title: x-security-scheme-required-values rule
  description: Validate that the x-security extension defines all required values for the security scheme used in an Arazzo description.
slug: /docs/cli/rules/respect/x-security-scheme-required-values
---

# x-security-scheme-required-values

Validate that `x-security` has all required `values` described according to the used `scheme`.

| Arazzo | Compatibility |
| ------ | ------------- |
| 1.x    | ✅            |

## API design principles

This is a Respect specific rule.
Different OpenAPI `securitySchemes` have some required values, like `token` or `username`.

An `oauth2` scheme accepts one of the following sets of values:

- `accessToken`: Respect sends the token as it is.
- `username` and `password`, when the scheme declares the `password` flow.
  A `clientId`, with or without a `clientSecret`, is optional.
- `clientId` and `clientSecret`, when the scheme declares the `clientCredentials` flow.

With the credentials of a flow, Respect requests the access token from the `tokenUrl` of that flow and reuses it until it expires.
A relative `tokenUrl` is resolved against the server URL of the request.

The token request has the following limits:

- Respect sends the client secret only in the HTTP Basic header, not in the request body.
- The token request is not in the `--verbose` output.
- A redirect from the token endpoint is an error.
  An optional `scope` value, a space-separated list, limits the scopes of the requested token.

## Configuration

| Option   | Type   | Description                                              |
| -------- | ------ | -------------------------------------------------------- |
| severity | string | Possible values: `off`, `warn`, `error`. Default: `off`. |

An example configuration:

```yaml
rules:
  x-security-scheme-required-values: error
```

## Examples

Given the following configuration:

```yaml
rules:
  x-security-scheme-required-values: error
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

Example of an entry with the `clientCredentials` flow of an `oauth2` scheme:

```yaml
- stepId: list-orders
  operationId: listOrders
  x-security:
    - scheme:
        type: oauth2
        flows:
          clientCredentials:
            tokenUrl: https://api.cafe.redocly.com/oauth2/token
            scopes:
              orders:read: Read access to orders
      values:
        clientId: $inputs.clientId
        clientSecret: $inputs.clientSecret
        scope: orders:read
```

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/respect/x-security-scheme-required-values.ts)
