# schema-name-unique

Verifies schema component names are unique.

|OAS|Compatibility|
|---|---|
|2.0|✅|
|3.0|✅|
|3.1|✅|


## API design principles

When generating code based on an OpenAPI definition, the code generator will create a class for each schema.
If they are not uniquely named, the generator will append numbers.
These numbers are non-deterministic.
By adding a new schema with the same component name it could change the name (appended number) of another one.

This clearly is not optimal. Having unique schema component names prevents such problems.

## Configuration

|Option|Type| Description                                                                              |
|---|---|------------------------------------------------------------------------------------------|
|severity|string| Possible values: `off`, `warn`, `error`. Default `off` (in `recommended` configuration). |

An example configuration:

```yaml
rules:
  schema-name-unique: error
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

- [parameter-name-unique](./parameter-name-unique.md)
- [response-name-unique](./response-name-unique.md)
- [request-body-name-unique](./request-body-name-unique.md)
- [no-unused-components](./no-unused-components.md)

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/common/schema-name-unique.ts)