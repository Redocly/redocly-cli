# request-body-name-unique

Verifies parameter component names are unique.

|OAS|Compatibility|
|---|---|
|2.0|✅|
|3.0|✅|
|3.1|✅|


## API design principles

Generating a single yaml/json file has problems with request bodies with the same component name.

It tends to reuse the first one and drops the other ones.

A way to prevent that is by using unique request body component names.

## Configuration

|Option|Type| Description                                                                              |
|---|---|------------------------------------------------------------------------------------------|
|severity|string| Possible values: `off`, `warn`, `error`. Default `off` (in `recommended` configuration). |

An example configuration:

```yaml
rules:
  request-body-name-unique: error
```

## Examples


Given this configuration:

```yaml
rules:
  request-body-name-unique: error
```

### Example of **incorrect** schema files

file1.yaml:
```yaml
paths:
  /test:
    post:
      requestBody:
        $ref: '#/components/requestBodies/MyRequestBody'
  /test2:
    post:
      requestBody:
        $ref: '/file2.yaml#/components/requestBodies/MyRequestBody'
components:
  requestBodies:
    MyRequestBody:
      required: true
      content:
        application/json:
          schema:
            type: string
```

file2.yaml:
```yaml
components:
  requestBodies:
    MyRequestBody:
      required: true
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
    post:
      requestBody:
        $ref: '#/components/requestBodies/TestRequestBody'
  /test2:
    post:
      requestBody:
        $ref: '/file2.yaml#/components/requestBodies/Test2RequestBody'
components:
  requestBodies:
    TestRequestBody:
      required: true
      content:
        application/json:
          schema:
            type: string
```

file2.yaml:
```yaml
components:
  requestBodies:
    Test2RequestBody:
      required: true
      content:
        application/json:
          schema:
            type: string
```

## Relates rules

- [schema-name-unique](./schema-name-unique.md)
- [parameter-name-unique](./parameter-name-unique.md)
- [response-name-unique](./response-name-unique.md)
- [no-unused-components](./no-unused-components.md)

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/common/request-body-name-unique.ts)
