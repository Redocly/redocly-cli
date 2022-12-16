# response-mime-type

|OAS|Compatibility|
|---|---|
|2.0|✅|
|3.0|✅|
|3.1|✅|


## API design principles

All of my mime jokes have been edited out of here.
I guess they didn't say much.

(get it?)

A good idea for response mime-types here is consistency.

Say, `application/json` anyone?

Keep it consistent across your entire API if possible.

"Keep em guessing" (but not in your API design).

## Configuration

|Option|Type|Description|
|---|---|---|
|severity|string|**REQUIRED.** Possible values: `off`, `warn`, `error`.|
|allowedValues|[string]|**REQUIRED.** List of allowed response mime types.|

An example configuration:

```yaml
rules:
  response-mime-type:
    severity: error
    allowedValues:
      - application/json
      - image/png
```
## Examples

Given this configuration:

```yaml
rules:
  response-mime-type:
    severity: error
    allowedValues:
      - application/json
      - image/png
```

Example of an **incorrect** response mime type:

```yaml
paths:
  /customers/{id}:
    post:
      responses:
        '200':
          description: OK
          content:
            application/xml:
              # ...
```

Example of a **correct** response mime type:

```yaml
paths:
  /customers/{id}:
    post:
      responses:
        '200':
          description: OK
          content:
            application/json:
              # ...
```

## Related rules

- [request-mime-type](./request-mime-type.md)
- [custom rules](./custom-rules.md)

## Resources

- [Rule source for OAS 3.0 and 3.1](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/oas3/response-mime-type.ts)
- [Rule source for OAS 2.0](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/oas2/response-mime-type.ts)
- [Response docs](https://redocly.com/docs/openapi-visual-reference/response/)
