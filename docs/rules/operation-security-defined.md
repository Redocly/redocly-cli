---
exclude: true
# TODO - some issues
---
# operation-security-defined

Verifies every operation or global security is defined.

|OAS|Compatibility|
|---|---|
|2.0|✅|
|3.0|✅|
|3.1|✅|

## API design principles

"Where are the public APIs?"

Public APIs are all around us, but they generally still require security credentials to measure usage and prevent abuse.

Not defining security credentials is an indication that someone forgot something.
What was it?
Aha!
We're letting you know here.

This is a good rule.
Every API should have security defined.
Even if the API is truly public without any credential required, define the empty security section to let people know you didn't forget.

```yaml
# This API has no security
security: []
```
## Configuration


|Option|Type|Description|
|---|---|---|
|severity|string|Possible values: `off`, `warn`, `error`. Default `error` (in `recommended` configuration). |

An example configuration:

```yaml
lint:
  rules:
    operation-security-defined: error
```

## Examples

Given this configuration:

```yaml
lint:
  rules:
    operation-security-defined: error
```

Example of **incorrect** security definition:

<!-- TODO -->

Example of **correct** security definition:


## Related rules

- [assertions](./assertions.md)
- [no-unused-components](./no-unused-components.md)

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/master/packages/core/src/rules/common/operation-security-defined.ts)
- [Security docs](https://redocly.com/docs/openapi-visual-reference/security/)
- [Security scheme docs](https://redocly.com/docs/openapi-visual-reference/security-schemes/)
