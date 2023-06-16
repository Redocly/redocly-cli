# parameter-name-unique

Verifies parameter component names are unique.

|OAS|Compatibility|
|---|---|
|2.0|✅|
|3.0|✅|
|3.1|✅|


## API design principles

When generating code based on an OpenAPI definition, the code generator will create a class for each parameter.
If they are not uniquely named, the generator will append numbers.
These numbers are non-deterministic.
By adding a new parameter with the same component name it could change the name (appended number) of another one.

This clearly is not optimal. Having unique parameter component names prevents such problems.

## Configuration

|Option|Type| Description                                                                              |
|---|---|------------------------------------------------------------------------------------------|
|severity|string| Possible values: `off`, `warn`, `error`. Default `off` (in `recommended` configuration). |

An example configuration:

```yaml
rules:
  parameter-name-unique: error
```

## Examples


Given this configuration:

```yaml
rules:
  parameter-name-unique: error
```

### Example of **incorrect** schema files

file1.yaml:
```yaml
paths:
  /test:
    get:
      parameters:
        - $ref: '#/components/parameters/ParameterOne'
        - $ref: '/file2.yaml#/components/parameters/ParameterOne'
components:
  parameters:
    ParameterOne:
      name: parameterOne
      in: query
      schema:
        type: integer
```

file2.yaml:
```yaml
components:
  parameters:
    ParameterOne:
      name: oneParameter
      in: query
      schema:
        type: integer
```

### Example of a **correct** schema files

file1.yaml:
```yaml
paths:
  /test:
    get:
      parameters:
        - $ref: '#/components/parameters/ParameterOne'
        - $ref: '/file2.yaml#/components/parameters/OneParameter'
components:
  parameters:
    ParameterOne:
      name: parameterOne
      in: query
      schema:
        type: integer
```

file2.yaml:
```yaml
components:
  parameters:
    OneParameter:
      name: oneParameter
      in: query
      schema:
        type: integer
```

## Relates rules

- [schema-name-unique](./schema-name-unique.md)
- [response-name-unique](./response-name-unique.md)
- [request-body-name-unique](./request-body-name-unique.md)
- [no-unused-components](./no-unused-components.md)

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/common/parameter-name-unique.ts)
