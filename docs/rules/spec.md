# spec

Ensures that your API document conforms to the [OpenAPI specification](https://spec.openapis.org/oas/v3.1.0.html).

|OAS|Compatibility|
|---|---|
|2.0|✅|
|3.0|✅|
|3.1|✅|


The default setting for this rule (in the `recommended` and `minimal` configuration) is `error`.

This is an essential rule that should not be turned off except in rare and special cases.

## API design principles

It's important to conform to the specification so that tools work with your API document. Doing so makes writing and maintenance of API definitions easier.

## Configuration

|Option|Type|Description|
|---|---|---|
|severity|string|Possible values: `off`, `warn`, `error`. Default `error` (in `recommended` configuration). |

An example configuration:

```yaml
rules:
  spec: error
```

## Examples

Given this configuration:

```yaml
rules:
  spec: error
```

Example of an **incorrect** spec:

```yaml
openapi: 3.0.0
info:
  version: 1.0.0
paths: {}
```

Example of a **correct** spec:

```yaml
openapi: 3.0.0
info:
  title: Ultra API
  version: 1.0.0
paths: {}
```

## Related rules

- [custom rules](./custom-rules.md)

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/common/spec.ts)
- [OpenAPI docs](https://redocly.com/docs/openapi-visual-reference/)
