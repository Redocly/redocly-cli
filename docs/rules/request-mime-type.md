# request-mime-type

|OAS|Compatibility|
|---|---|
|2.0|✅|
|3.0|✅|
|3.1|✅|

## API design principles

All of my mime jokes have been edited out of here.
I guess they didn't say much.

(get it?)

A good idea for request mime-types here is consistency.

Are you in the `application/json` or `application/x-www-form-urlencoded` camp?
It doesn't matter to me... keep it consistent across your entire API if possible.

(Except for those `application/octet-stream` or `multipart/form-data` file uploads...)

## Configuration


|Option|Type|Description|
|---|---|---|
|severity|string|**REQUIRED.** Possible values: `off`, `warn`, `error`.|
|allowedValues|[string]|**REQUIRED.** List of allowed request mime types.|

An example configuration:

```yaml
rules:
  request-mime-type:
    severity: error
    allowedValues:
      - application/json
```

## Examples

Given this configuration:

```yaml
rules:
  request-mime-type:
    severity: error
    allowedValues:
      - application/json
```

Example of an **incorrect** request mime type:

```yaml
paths:
  /customers/{id}:
    post:
      requestBody:
        content:
          multipart/form-data:
            # ...
```

Example of a **correct** request mime type:

```yaml
paths:
  /customers/{id}:
    post:
      requestBody:
        content:
          application/json:
            # ...
```

## Related rules

- [response-mime-type](./response-mime-type.md)
- [custom rules](./custom-rules.md)

## Resources

- [Rule source for OAS 3.0 and 3.1](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/oas3/request-mime-type.ts)
- [Rule source for OAS 2.0](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/oas2/request-mime-type.ts)
- [Request body docs](https://redocly.com/docs/openapi-visual-reference/request-body/)
