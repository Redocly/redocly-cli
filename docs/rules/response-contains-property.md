# response-contains-property

Enforces definition of specific response properties based on HTTP status code or HTTP status code range. A specific status code takes priority over the status code range.

|OAS|Compatibility|
|---|---|
|2.0|✅|
|3.0|✅|
|3.1|✅|


## API design principles

In some cases, it is important to design an API so that it consistently returns specific properties in responses. Sometimes people want different response properties for collections compared to an individual resource. This rule helps enforce that behavior across all or some responses in an API.

## Configuration


|Option|Type|Description|
|---|---|---|
|severity|string|**REQUIRED.** Possible values: `off`, `warn`, `error`.|
|names|Map (HTTP response code or range, [string])|**REQUIRED.** For a given HTTP response code or range, the corresponding list of expected response properties.|

An example configuration:

```yaml
rules:
  response-contains-property:
    severity: error
    names:
      2XX:
        - created_at
        - updated_at
      '400':
        - code
```

## Examples


Given this configuration:

```yaml
rules:
  response-contains-property:
    severity: error
    names:
      2XX:
        - created_at
        - updated_at
      '400':
        - code
```

Example of an **incorrect** response:

```yaml
paths:
  /customers:
    post:
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: object
                properties:
                  id:
                    type: integer
```

Example of a **correct** response:

```yaml
paths:
  /customers:
    post:
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: object
                properties:
                  id:
                    type: integer
                  created_at:
                    type: string
                    format: date-time
                  updated_at:
                    type: string
                    format: date-time
```

## Related rules

- [response-contains-headers](./response-contains-header.md)
- [response-mime-type](./response-mime-type.md)
- [custom rules](./custom-rules.md)

## Resources

- [Rule source for OAS 3.0 and 3.1](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/oas3/response-contains-property.ts)
- [Rule source for OAS 2.0](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/oas2/response-contains-property.ts)
- [Response docs](https://redocly.com/docs/openapi-visual-reference/response/)
