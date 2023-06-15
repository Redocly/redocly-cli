# response-name-unique

Verifies parameter component names are unique.

|OAS|Compatibility|
|---|---|
|2.0|✅|
|3.0|✅|
|3.1|✅|


## API design principles

Generating a single yaml/json file has problems with responses with the same component name.

It tends to reuse the first one and drops the other ones.

## Configuration

|Option|Type| Description                                                                              |
|---|---|------------------------------------------------------------------------------------------|
|severity|string| Possible values: `off`, `warn`, `error`. Default `off` (in `recommended` configuration). |

An example configuration:

```yaml
rules:
  response-name-unique: error
```

## Examples


Given this configuration:

```yaml
rules:
  response-name-unique: error
```

### Example of **incorrect** schema files

file1.yaml:
```yaml
paths:
  /test:
    get:
      responses:
        '200':
          $ref: '#/components/responses/SuccessResponse'
  /test2:
    get:
      responses:
        '200':
          $ref: '/test.yaml#/components/responses/SuccessResponse'
components:
  responses:
    SuccessResponse:
      description: Successful response
      content:
        application/json:
          schema:
            type: string
```

file2.yaml:
```yaml
components:
  responses:
    SuccessResponse:
      description: Successful response
      content:
        application/json:
          schema:
            type: string
```

### Example of a **correct** schema files

file1.yaml:
```yaml
paths:
  /test:
    get:
      responses:
        '200':
          $ref: '#/components/responses/TestSuccessResponse'
  /test2:
    get:
      responses:
        '200':
          $ref: '/test.yaml#/components/responses/Test2SuccessResponse'
components:
  responses:
    TestSuccessResponse:
      description: Successful response
      content:
        application/json:
          schema:
            type: string
```

file2.yaml:
```yaml
components:
  responses:
    Test2SuccessResponse:
      description: Successful response
      content:
        application/json:
          schema:
            type: string
```

## Relates rules

- [schema-name-unique](./schema-name-unique.md)
- [parameter-name-unique](./schema-name-unique.md)
- [no-unused-components](./no-unused-components.md)

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/common/parameter-name-unique.ts)
