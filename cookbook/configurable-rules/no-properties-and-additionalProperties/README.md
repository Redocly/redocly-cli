# No `properties` and `additionalProperties` fields in schemas

Authors:

- `@tatomyr` Andrew Tatomyr (Redocly)

## What this does and why

Albeit JSON Schema allows defining an object schema with both `properties` and `additionalProperties` (or `unevaluatedProperties` if you're an advanced user), it is often considered a bad practice to mix objects and records (in other words -- closed and open shapes).
To enforce a more sound schemas design, this rule flags any object schema that has both `properties` and `additionalProperties` defined.
It is worth mentioning that the absence of `additionalProperties` technically means that the schema is open, but Redocly's linter warns you about the extra properties anyway, and it at least means that you don't want to mix object and records explicitly.

## Code

That said, let's start with a naīve approach to the rule:

```yaml
rules:
  rule/no-properties-and-additionalProperties:
    subject:
      type: Schema
    assertions:
      mutuallyExclusive:
        - properties
        - additionalProperties
    message: Schemas should not have both 'properties' and 'additionalProperties' defined.
```

This reads simple, however, the rule omits one important case: you may want to deliberately close your schemas with `additionalProperties: false` which is a bit unusual but even more valid then the absence of the field.
To account for this, we can add a `where` clause to the rule:

```yaml
rules:
  rule/no-properties-and-additionalProperties:
    subject:
      type: Schema
      property: additionalProperties
    assertions:
      const: false
    where:
      - subject:
          type: Schema
          property: properties
        assertions:
          defined: true
```

It reads as the following: 'Where a `Schema` has `properties` defined, its `additionalProperties` field, if present, must be false.'

## Examples

Here's an OpenAP sample with both correct and incorrect schemas:

```yaml
components:
  schemas:
    MixedOpenAndClosedShapes: # wrong
      type: object
      properties:
        id:
          type: string
      additionalProperties: true # <- this will be flagged by the rule
    NoAdditionalProperties: # correct
      type: object
      properties:
        id:
          type: string
    ExplicitlyClosedShape: # correct
      type: object
      properties:
        id:
          type: string
      additionalProperties: false # explicitly closed schema is allowed too
```
