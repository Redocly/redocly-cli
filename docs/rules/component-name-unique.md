# component-name-unique

Verifies schema component names are unique.

|OAS|Compatibility|
|---|---|
|2.0|✅|
|3.0|✅|
|3.1|✅|


## API design principles

When generating code based on an OpenAPI definition, there are various different problems when component names are not
unique through the whole spec.

- schema: The code generator creates a class for each schema.
  If they are not uniquely named, the generator will append numbers. These numbers are non-deterministic.
  By adding a new schema with the same component name it could change the name (appended number) of another one.
- parameter: The code generator creates a class for each parameter.
  If they are not uniquely named, the generator will append numbers. These numbers are non-deterministic.
  By adding a new parameter with the same component name it could change the name (appended number) of another one.
- response: The code generator tends to reuse the first one and drops the other ones with the same component name.
- requestBody: The code generator tends to reuse the first one and drops the other ones with the same component name.

This clearly is not optimal. Having unique component names prevents these problems.

## Configuration

| Option      |Type| Description                                                                              |
|-------------|---|------------------------------------------------------------------------------------------|
| severity    |string| Possible values: `off`, `warn`, `error`. Default `off` (in `recommended` configuration). |
| schema      |string| Possible values: `off`, `warn`, `error`. Default: not set. |
| parameter   |string| Possible values: `off`, `warn`, `error`. Default: not set. |
| response    |string| Possible values: `off`, `warn`, `error`. Default: not set. |
| requestBody |string| Possible values: `off`, `warn`, `error`. Default: not set. |

An example configuration:

```yaml
rules:
  schema-name-unique:
    schema: error
    parameter: off
    response: warn
    requestBody: warn
```

## Examples


Given this configuration:

```yaml
rules:
  schema-name-unique: error
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

### Example of a **correct** schema files

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

- [no-unused-components](./no-unused-components.md)

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/common/component-name-unique.ts)
