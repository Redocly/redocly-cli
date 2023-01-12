# operation-4xx-response

Ensures that every operation in your API document has at least one error (400-499) HTTP response defined.

|OAS|Compatibility|
|---|---|
|2.0|✅|
|3.0|✅|
|3.1|✅|

## API design principles

Every operation should have a 400-499 (problem) HTTP response.
After all, what API doesn't have a problem from time to time?

In practice, some APIs do not return error responses. This design is based on an old-school belief that all responses, including errors, should return HTTP 200 OK.
While this thinking has mostly changed (for the better in our opinion), it does still exist. If your organization believes every API should only return HTTP 200 OK, then disable this rule, or even create an opposite rule to error on any defined 4XX responses.

## Configuration

|Option|Type|Description|
|---|---|---|
|severity|string|Possible values: `off`, `warn`, `error`. Default `warn` (in `recommended` configuration). |
|validateWebhooks|boolean|Determines if responses inside webhooks are validated. Default `false`. |

An example configuration:

```yaml
rules:
  operation-4xx-response: error
```

The following example enables validation of responses inside webhooks:

```yaml
rules:
  operation-4xx-response: 
    severity: error
    validateWebhooks: true
```

## Examples

Given this configuration:

```yaml
rules:
  operation-4xx-response: error
```

Example of **incorrect** operation response:
```yaml
post:
  responses:
    '200':
      $ref: ../components/responses/Success.yaml
```

Example of **correct** operation response:

```yaml
post:
  responses:
    '200':
      $ref: ../components/responses/Success.yaml
    '400':
      $ref: ../components/responses/Problem.yaml
```
## Related rules

- [operation-2xx-response](./operation-2xx-response.md)

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/common/operation-4xx-response.ts)
- [Responses map docs](https://redocly.com/docs/openapi-visual-reference/responses/)
