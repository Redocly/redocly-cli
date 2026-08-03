# JSON Schema misconfigurations

Authors:

- [`adamaltman`](https://github.com/adamaltman) Adam Altman (Redocly)

## What this does and why

This catches common misconfigurations of JSON Schema:

- disallows `minimum` or `maximum` values for a string (these are more logical for a number)
- disallows `items` on an object (instead of an array)
- disallows `properties` on an array (instead of items)

## Code

The first rule checks that a string isn't using the `minimum` and `maximum` keywords.

```yaml
rule/json-schema-string-misconfiguration:
  subject:
    type: Schema
  where:
    - subject:
        type: Schema
        property: type
      assertions:
        const: string
  assertions:
    disallowed:
      - minimum
      - maximum
```

The second rule checks that an array isn't using the `properties` keyword.

```yaml
rule/json-schema-array-misconfiguration:
  subject:
    type: Schema
  where:
    - subject:
        type: Schema
        property: type
      assertions:
        const: array
  assertions:
    disallowed:
      - properties
```

The third rule checks that an object isn't using the `items` keyword.

```yaml
rule/json-schema-object-misconfiguration:
  subject:
    type: Schema
  where:
    - subject:
        type: Schema
        property: type
      assertions:
        const: object
  assertions:
    disallowed:
      - items
```

## Examples

The following OpenAPI has schemas prefixed with either `Good` or `Bad` to show the configurable rules catch the likely bad uses of keywords.

```yaml
openapi: 3.1.0
info:
  title: Redocly Cafe schema misconfigurations
  version: 1.0.0
paths: {}
components:
  schemas:
    BadCustomerName:
      type: string
      minimum: 1
      maximum: 100

    GoodPrice:
      type: integer
      minimum: 0
      maximum: 10000

    GoodCustomerName:
      type: string
      minLength: 1
      maxLength: 100

    BadOrder:
      type: object
      items:
        type: string

    GoodOrder:
      type: object
      properties:
        customerName:
          $ref: '#/components/schemas/GoodCustomerName'

    BadOrderItems:
      type: array
      properties:
        customerName:
          $ref: '#/components/schemas/GoodCustomerName'
```

## References

Inspired by a question in the "APIs You Won't Hate" Slack community (special thanks to Can Vural and Phil Sturgeon).
