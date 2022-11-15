# path-declaration-must-exist

Requires definition of all path template variables.

|OAS|Compatibility|
|---|---|
|2.0|✅|
|3.0|✅|
|3.1|✅|


## API design principles

The path template variables must have a string.
This rule is for spec correctness.
This rule is not opinionated.

## Configuration


|Option|Type|Description|
|---|---|---|
|severity|string|Possible values: `off`, `warn`, `error`. Default `error` (in `recommended` configuration). |

An example configuration:

```yaml
rules:
  path-declaration-must-exist: error
```

## Examples


Given this configuration:

```yaml
rules:
  path-declaration-must-exist: error
```

Example of an **incorrect** path:

```yaml
paths:
  /customers/{}:
    post:
```

Example of a **correct** path:

```yaml
paths:
  /customers/{id}:
    post:
      parameters:
        - name: id
          in: path
          required: true
          description: The customer's ID.
```

## Related rules

- [path-parameters-defined](./path-parameters-defined.md)
- [path-excludes-patterns](./path-excludes-patterns.md)
- [custom rules](./custom-rules.md)

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/common/path-declaration-must-exist.ts)
- [Parameter docs](https://redocly.com/docs/openapi-visual-reference/parameter/)
- [Paths docs](https://redocly.com/docs/openapi-visual-reference/paths/)
