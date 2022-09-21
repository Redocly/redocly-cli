# operation-4xx-problem-details-rfc7807

Ensures that every operation with (400-499) HTTP response has content-type `application/problem+json` and fields `title` and `type`.

| OAS | Compatibility |
| --- | ------------- |
| 2.0 | ❌            |
| 3.0 | ✅            |
| 3.1 | ✅            |

## API design principles

Problem Details for HTTP APIs are a way to carry machine-
readable details of errors in a HTTP response to avoid the need to
define new error response formats for HTTP APIs.

Every operation with (400-499) HTTP response should have content-type `application/problem+json` and fields `title` and `type` according to the [specification](https://datatracker.ietf.org/doc/html/rfc7807).

## Configuration

| Option   | Type   | Description                                                                              |
| -------- | ------ | ---------------------------------------------------------------------------------------- |
| severity | string | Possible values: `off`, `warn`, `error`. Default `off` (in `recommended` configuration). |

An example configuration:

```yaml
styleguide:
  rules:
    operation-4xx-problem-details-rfc7807: error
```

## Examples

Given this configuration:

```yaml
styleguide:
  rules:
    operation-4xx-problem-details-rfc7807: error
```

Example of **incorrect** operation response:

```yaml
post:
  responses:
    '400':
      content:
        application/json:
          schema:
            type: object
            properties:
              type:
                type: string
              title:
                type: string
```

Example of **correct** operation response:

```yaml
post:
  responses:
    '400':
      content:
        application/problem+json:
          schema:
            type: object
            properties:
              type:
                type: string
              title:
                type: string
```

## Related rules

- [operation-4xx-response](./operation-4xx-response.md)

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/common/operation-4xx-response.ts)
- [Responses map docs](https://redocly.com/docs/openapi-visual-reference/responses/)
