# Require `items` field for schemas of type `array`

Authors:

- `@tatomyr` Andrew Tatomyr (Redocly)

## What this does and why

When declaring a JSON Schema, it's possible to define an array without specifying what type of items are in the array.
Linting with Redocly tools simply omits this, as it is considered an arbitrary array with any kind of item.
However, to enforce the explicitness, you can use a [configurable rule](https://redocly.com/docs/cli/rules/configurable-rules/).

**Note:** Whilst OAS 3.0.x specification does not enforce using the `items` field in descriptions, OAS 3.1.x fully supports JSON Schema 2020-12 draft which requires it. However, Redocly CLI doesn't alter the behavior and allows the omission of `items`.

## Code

Add this to the `rules` section of your `redocly.yaml`:

```yaml
rules:
  rule/required-items-in-array-schemas:
    subject:
      type: Schema
    assertions:
      required:
        - items
    where:
      - subject:
          type: Schema
          property: type
        assertions:
          const: array
          defined: true
    message: The 'items' field is required for schemas of array type.
```

This rule will error if an array is declared without an `items` field.
The `where` section is used to filter the rule to only apply to schemas of type `array`.
Note the `defined: true` assertion, which ensures that the `type` field is defined.

## Examples

Here's a sample of an OpenAPI description:

```yaml
# ...
components:
  schemas:
    OrderItems: # This will error
      type: array
    MenuItemNames: # This will pass
      type: array
      items:
        type: string
    CustomerName: # This will pass, doesn't match the 'where' clause
      type: string
```
