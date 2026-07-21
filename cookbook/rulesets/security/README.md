# Security ruleset, a collection of security-conscious rules

Authors:

- [`@lornajane`](https://github.com/lornajane) Lorna Mitchell (Redocly)

## What this does and why

A ruleset to pick up on some common API mistakes using linting.
A security mindset means more than a few linting rules - but we hope that they help!

Included in this set are a few defensive data type rules, plus a few others from the OWASP recommendations:

- `rule/no-http-basic` - Don't use HTTP Basic auth
- `rule/operation-security` - Security must be defined at the operation level
- `rule/https-server-urls` - Server URLs must use https
- `rule/limit-string-length` - Avoid overflow errors by setting a maximum length for string values
- `rule/limit-array-length` - Avoid overflow errors by setting a maximum number of array items

What else should be here? Open an issue - or a pull request.

## Code

The following code snippet shows the rules to use:

```yaml
rules:
  rule/no-http-basic:
    message: HTTP Basic should not be used.
    subject:
      type: SecurityRequirement
      property: scheme
    assertions:
      notPattern: /basic/i
    where:
      - subject:
          type: SecurityRequirement
        assertions:
          defined: true
    severity: error

  rule/operation-security:
    message: Security must be defined at the operation level.
    subject:
      type: Operation
      property: security
    assertions:
      defined: true
    severity: warn

  rule/https-server-urls:
    message: Server URLs must start with "https:".
    subject:
      type: Server
      property: url
    assertions:
      pattern: /^https:/
    severity: error

  rule/limit-string-length:
    message: Strings must have maxLength defined, or be an enum/const
    subject:
      type: Schema
    assertions:
      requireAny:
        - maxLength
        - enum
        - const
    where:
      - subject:
          type: Schema
          property: type
        assertions:
          const: string
          defined: true
    severity: warn

  rule/limit-array-length:
    message: Arrays must have a maxItems property
    subject:
      type: Schema
    assertions:
      required:
        - maxItems
    where:
      - subject:
          type: Schema
          property: type
        assertions:
          const: array
          defined: true
    severity: warn
```

You can copy and paste this configuration into your own `redocly.yaml` file, and adjust the `severity` settings to suit your use case.

Then run `redocly lint` to apply the linting rules to your API description.

## Examples

Each rule has its own example. Run `redocly lint openapi.yaml` to lint your API description.

## HTTP Basic should not be used

This rule picks up where a security scheme uses a scheme of "Basic" (or "basic").
Avoid using an example like the following:

```yaml
components:
  securitySchemes:
    LegacyAuth:
      type: http
      scheme: basic
```

It is recommended to use a scheme such as bearer or digest in your APIs.

## Security must be defined at the operation level

OpenAPI allows security to be defined at the top level of the document, but this rule adds a check that every endpoint has a security definition.
By intentionally securing each endpoint with an appropriate configuration, security mistakes are less likely to occur.

Each operation should look like the example below:

```yaml
operationId: getRevenue
summary: Get revenue statistics
security:
  - ApiKey: []
description: Retrieve revenue statistics for a configurable date range.
```

This approach also makes it easier to use tighter security for endpoints with side effects.

## Server URLs must start with "https:"

It is good practice to use HTTPS endpoints to protect any credentials or important information during transit.
This rule identifies any plain `http://` URLs in the server array, such as the following example:

```yaml
servers:
  - url: 'http://api.cafe.redocly.com'
```

Correct this problem by using `https://` URLs for all endpoints.

## Strings must have maxLength defined, or be an enum/const

To avoid API endpoints receiving payloads that could cause overflow errors, set limits on the size of the fields that can be accepted or define specific values that can be sent.

All of the following field examples are acceptable:

```yaml
components:
  schemas:
    OrderStatus:
      description: Order status.
      type: string
      enum:
        - placed
        - preparing
        - completed
        - canceled
      example: placed
    Object:
      description: Entity name.
      type: string
      const: order
    CustomerName:
      description: Name of the customer who placed the order.
      type: string
      maxLength: 100
      example: Mary Ann
```

Note that the `const` keyword came in with the updated JSON Schema version in OpenAPI 3.1.
For OpenAPI 3.0, use an `enum` field with a single option.

## Arrays must have a maxItems property

Similar to the previous point about setting a maximum string field size, set a realistic limit for the size of the arrays that your endpoints accept.
By setting a maximum array size to a sensible limit, you can avoid having your API endpoints try to process something so large that they cause problems.

The following example shows an array field with a limit set:

```yaml
OrderItems:
  type: array
  maxItems: 10
  items:
    $ref: '#/components/schemas/OrderItem'
  description: List of items to include in the order.
```

Pick a limit that's generous for the size of the data that you expect, but small enough that it can be handled without performance implications.

## References

- [OWASP top ten](https://owasp.org/Top10/)
- Published linting rulesets from [Spectral](https://blog.stoplight.io/spectral-owasp-api-2023-security-ruleset) and [Vacuum](https://quobix.com/vacuum/rules/owasp/)
