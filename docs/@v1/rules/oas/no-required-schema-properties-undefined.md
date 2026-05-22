---
slug: /docs/cli/v1/rules/oas/no-required-schema-properties-undefined
---

# no-required-schema-properties-undefined

Ensures there are no required schema properties that are undefined.

| OAS | Compatibility |
| --- | ------------- |
| 2.0 | ✅            |
| 3.0 | ✅            |
| 3.1 | ✅            |

```mermaid
flowchart TD

Root ==> Components ==> Schemas

style Schemas fill:#codaf9,stroke:#0044d4,stroke-width:5px
```

## API design principles

If a required schema property is declared but not defined, this rule informs you which of the required schema properties are missing.

## Configuration

| Option   | Type   | Description                                                                              |
| -------- | ------ | ---------------------------------------------------------------------------------------- |
| severity | string | Possible values: `off`, `warn`, `error`. Default `off` (in `recommended` configuration). |

An example configuration:

```yaml
rules:
  no-required-schema-properties-undefined: error
```

## Examples

Given this configuration:

```yaml
rules:
  no-required-schema-properties-undefined: error
```

Example of **incorrect** schema properties:

```yaml
schemas:
  Pet:
    type: object
    required:
      - id
      - name
    properties:
      id:
        type: integer
        format: int64
```

Expected error message when linting incorrect schema example:

```bash
Required property 'name' is undefined.
```

Example of **correct** schema properties:

```yaml
schemas:
  Pet:
    type: object
    required:
      - id
      - name
    properties:
      id:
        type: integer
        format: int64
      name:
        type: string
        example: doggie
```

The rule is case-sensitive, which means a property `name` does not match the string `Name` in the `required` list:

```yaml
schemas:
  Pet:
    type: object
    properties:
      name:
        type: string
    required:
      - Name
```

The rule accepts bare `required` constraints on property sub-schemas when the property's type is defined in a parent `allOf` sibling. This is a valid JSON Schema pattern for adding presence constraints on top of a referenced base type:

```yaml
schemas:
  PersonBase:
    type: object
    properties:
      personName:
        type: object
        properties:
          givenName:
            type: string
          familyName:
            type: string
  Person:
    type: object
    allOf:
      - $ref: '#/components/schemas/PersonBase'
    properties:
      personName:
        required:
          - givenName
          - familyName
    required:
      - personName
```

The rule also accepts `oneOf` branches used as pure constraint fragments, where each branch contains only a `required` keyword and the property's type is defined in a parent `allOf` sibling:

```yaml
schemas:
  PersonBase:
    type: object
    properties:
      communication:
        type: object
        properties:
          landlines:
            type: array
          mobiles:
            type: array
          emails:
            type: array
  Person:
    type: object
    allOf:
      - $ref: '#/components/schemas/PersonBase'
    properties:
      communication:
        oneOf:
          - required:
              - landlines
          - required:
              - mobiles
          - required:
              - emails
    required:
      - communication
```

Misspellings in bare `required` lists are still caught. If a required key does not exist in the property's type definition resolved through the parent `allOf` sibling, the rule reports an error:

```yaml
schemas:
  Person:
    type: object
    allOf:
      - $ref: '#/components/schemas/PersonBase'
    properties:
      personName:
        required:
          - giveName # misspelling of givenName
    required:
      - personName
```

```bash
Required property 'giveName' is undefined.
```

## Related rules

- [no-invalid-schema-examples](./no-invalid-schema-examples.md)

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/common/no-required-schema-properties-undefined.ts)
- [Schema docs](https://redocly.com/docs/openapi-visual-reference/schemas/)
