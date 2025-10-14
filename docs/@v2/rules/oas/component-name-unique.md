---
slug: /docs/cli/rules/oas/component-name-unique
---

# component-name-unique

Verifies component names are unique.

| OAS | Compatibility |
| --- | ------------- |
| 2.0 | ❌            |
| 3.0 | ✅            |
| 3.1 | ✅            |
| 3.2 | ✅            |

## API design principles

When generating code based on an OpenAPI description, there are various different problems when component names are not
unique through the whole spec.

- schema: The code generator creates a class for each schema.
  If they are not uniquely named, the generator appends numbers. These numbers are non-deterministic.
  By adding a new schema with the same component name it could change the name (appended number) of another one.
- parameter: The code generator creates a class for each parameter.
  If they are not uniquely named, the generator appends numbers. These numbers are non-deterministic.
  By adding a new parameter with the same component name it could change the name (appended number) of another one.
- response: The code generator tends to reuse the first one and drops the other ones with the same component name.
- requestBody: The code generator tends to reuse the first one and drops the other ones with the same component name.

This clearly is not optimal. Having unique component names prevents these problems.

## Configuration

| Option        | Type   | Description                                                                              |
| ------------- | ------ | ---------------------------------------------------------------------------------------- |
| severity      | string | Possible values: `off`, `warn`, `error`. Default `off` (in `recommended` configuration). |
| schemas       | string | Possible values: `off`, `warn`, `error`. Default: not set.                               |
| parameters    | string | Possible values: `off`, `warn`, `error`. Default: not set.                               |
| responses     | string | Possible values: `off`, `warn`, `error`. Default: not set.                               |
| requestBodies | string | Possible values: `off`, `warn`, `error`. Default: not set.                               |

An example configuration:

```yaml
rules:
  component-name-unique:
    schemas: error
    parameters: off
    responses: warn
    requestBodies: warn
```

## Examples

Given this configuration:

```yaml
rules:
  component-name-unique: error
```

### Example of **incorrect** schema files

file1.yaml:

```yaml
components:
  schemas:
    FooSchema:
      type: object
      properties:
        field:
          $ref: './file2.yaml#/components/schemas/FooSchema'
```

file2.yaml:

```yaml
components:
  schemas:
    FooSchema:
      type: object
      properties:
        otherField:
          type: string
```

### Example of **correct** schema files

file1.yaml:

```yaml
components:
  schemas:
    FooSchema:
      type: object
      properties:
        field:
          $ref: './file2.yaml#/components/schemas/AnotherFooSchema'
```

file2.yaml:

```yaml
components:
  schemas:
    AnotherFooSchema:
      type: object
      properties:
        otherField:
          type: string
```

## Relates rules

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/oas3/component-name-unique.ts)
- [no-unused-components](./no-unused-components.md)
