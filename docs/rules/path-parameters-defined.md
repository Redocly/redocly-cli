# path-parameters-defined

Requires all path template variables are defined as path parameters.

|OAS|Compatibility|
|---|---|
|2.0|✅|
|3.0|✅|
|3.1|✅|


## API design principles

You declared them?
Now define them.
This rule verifies the path parameters are defined.

## Configuration


|Option|Type|Description|
|---|---|---|
|severity|string|Possible values: `off`, `warn`, `error`. Default `error` (in `recommended` configuration). |

An example configuration:

```yaml
rules:
  path-parameters-defined: error
```

## Examples


Given this configuration:

```yaml
rules:
  path-parameters-defined: error
```

Example of an **incorrect** path:

```yaml
paths:
  /customers/{id}:
    post:
      parameters:
        - name: filter
          in: query
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

- [path-declaration-must-exist](./path-declaration-must-exist.md)
- [path-excludes-patterns](./path-excludes-patterns.md)
- [custom rules](./custom-rules.md)

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/common/path-params-defined.ts)
- [Paths docs](https://redocly.com/docs/openapi-visual-reference/paths/)
