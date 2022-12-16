# response-contains-header

Requires that response objects with specific HTTP status codes or ranges contain specified response headers.

|OAS|Compatibility|
|---|---|
|2.0|✅|
|3.0|✅|
|3.1|✅|

## API design principles

In some cases, it is important to design an API so that it consistently returns specific properties in responses. A common example is to return pagination headers for collections. This rule helps achieve the desired consistency across all or some responses in an API.

## Configuration


|Option|Type|Description|
|---|---|---|
|severity|string|**REQUIRED.** Possible values: `off`, `warn`, `error`.|
|names|Map (HTTP response code or range, [string])|**REQUIRED.** For a given HTTP response code or range, the corresponding list of expected HTTP response headers.|

An example configuration:

```yaml
rules:
  response-contains-header:
    severity: error
    names:
      2XX:
        - x-request-id
        - x-correlation-id
      '400':
        - Content-Length
        - x-correlation-id
```

## Examples

Given this configuration:

```yaml
rules:
  response-contains-header:
    severity: error
    names:
      2XX:
        - x-request-id
        - x-correlation-id
      '400':
        - Content-Length
        - x-correlation-id
```

Example of an **incorrect** response:

```yaml
paths:
  /customers/{id}:
    post:
      responses:
        '200':
          description: OK
          headers:
            x-request-id:
              description: The request ID returned in the response.
              schema:
                type: string
```

Example of a **correct** response:

```yaml
paths:
  /customers/{id}:
    post:
      responses:
        '200':
          description: OK
          headers:
            x-request-id:
              description: The request ID returned in the response.
              schema:
                type: string
            x-correlation-id:
              description: The correlation ID for log audit purposes.
              schema:
                type: string
```

## Related rules

- [response-contains-property](./response-contains-property.md)
- [response-mime-type](./response-mime-type.md)
- [custom rules](./custom-rules.md)

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/common/response-contains-header.ts)
- [Response docs](https://redocly.com/docs/openapi-visual-reference/response/)
