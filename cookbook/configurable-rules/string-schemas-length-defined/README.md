# String schemas length defined

Authors:

- [`adamaltman`](https://github.com/adamaltman) Adam Altman (Redocly)

## What this does and why

This requires `minLength` and `maxLength` properties set on a `string` where `enum` isn't defined.

## Code

The rule checks that a `string` uses the `minLength` and `maxLength` keywords unless an `enum` is defined.

It does this by using a combination `requireAny` and `mutuallyRequired`.

```yaml
rules:
  rule/string-schemas-length-defined:
    subject:
      type: Schema
    where:
      - subject:
          type: Schema
          property: type
        assertions:
          const: string
    assertions:
      requireAny:
        - minLength
        - maxLength
        - enum
      mutuallyRequired:
        - minLength
        - maxLength
```

## Examples

The following OpenAPI has schemas prefixed with either `Good` or `Bad` to show the configurable rules catch the likely bad uses of keywords.

```yaml
openapi: 3.1.0
info:
  title: Redocly Cafe strict string definitions
  version: 1.0.0
paths: {}
components:
  schemas:
    MenuItemPrice: # should not be caught by these rules
      type: integer

    BadCustomerName:
      type: string

    BadCommentWithMinLength:
      type: string
      minLength: 1

    BadPhotoDescriptionWithMaxLength:
      type: string
      maxLength: 500

    GoodOrderStatusBecauseEnum:
      type: string
      enum:
        - placed
        - preparing
        - completed
        - canceled

    GoodCustomerNameBecauseMinAndMaxLength:
      type: string
      minLength: 1
      maxLength: 100
```

## References

Inspired by a question from Keith F.
