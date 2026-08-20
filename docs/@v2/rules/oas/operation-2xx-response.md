---
slug: /docs/cli/rules/oas/operation-2xx-response
---

# operation-2xx-response

Ensures that every operation in your API document has at least one successful (200-299) HTTP response defined.

| OAS | Compatibility |
| --- | ------------- |
| 2.0 | ✅            |
| 3.0 | ✅            |
| 3.1 | ✅            |
| 3.2 | ✅            |

## API design principles

One of the main goals of your API description (and your API documentation) is to help consumers understand how your API behaves and what to expect when working with it.

When designing your APIs, every operation should have a successful HTTP response.
If it doesn't, what is the purpose of the operation?
Even if there is no response content (204), it can still return a successful response with no content.
You can greatly improve the developer and user experience of your APIs by making it a standard to provide this information.

## Configuration

| Option           | Type    | Description                                                                               |
| ---------------- | ------- | ----------------------------------------------------------------------------------------- |
| severity         | string  | Possible values: `off`, `warn`, `error`. Default `warn` (in `recommended` configuration). |
| validateWebhooks | boolean | Determines if responses inside webhooks are validated. Default `false`.                   |
| allowDefault     | boolean | Determines if a `default` response satisfies the rule. Default `true`.                    |

An example configuration:

```yaml
rules:
  operation-2xx-response: error
```

The following example enables validation of responses inside webhooks:

```yaml
rules:
  operation-2xx-response:
    severity: error
    validateWebhooks: true
```

By default, a `default` response counts as a successful response.
Set `allowDefault: false` to require an explicit 2xx status code:

```yaml
rules:
  operation-2xx-response:
    severity: error
    allowDefault: false
```

With `allowDefault: false`, the following operation is reported, because `default` describes the responses the operation does not list rather than what a successful call returns:

```yaml
post:
  responses:
    default:
      $ref: ../components/responses/Problem.yaml
```

This matters for code generation: a generator reads the 2xx response to produce the return type of the operation.
A `default`-only operation gives it no success shape to model, so the generated client falls back to an untyped or empty result.

## Examples

Given this configuration:

```yaml
rules:
  operation-2xx-response: error
```

Example of **incorrect** operation response:

```yaml
post:
  responses:
    '400':
      $ref: ../components/responses/Problem.yaml
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

- [operation-4xx-response](operation-4xx-response.md)

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/common/operation-2xx-response.ts)
- [Responses map docs](https://redocly.com/docs/openapi-visual-reference/responses/)
