# path-segment-plural

Enforces plural path segments.

|OAS|Compatibility|
|---|---|
|2.0|✅|
|3.0|✅|
|3.1|✅|


## API design principles

RESTful API design often uses resources in path segments and those resources are typically plural.

For example, "customers" instead of "customer" because:

- `GET /customers` means getting a collection of customers
- `GET /customers/abc` means getting customer ABC from the customers collection

As your API grows, you'll likely hit some false positives and may also need to ignore a few outliers.
That is, unless you're a purist.
Nothing wrong with that.

## Configuration


|Option|Type|Description|
|---|---|---|
|severity|string|Possible values: `off`, `warn`, `error`. Default `off` (in `recommended` configuration). |
|ignoreLastPathSegment|boolean|Ignores the last path segment if true. Default value: `false`.|
|exceptions|[string]|List of strings to exclude when checking path segments, for example, `v1`.|

An example configuration:

```yaml
rules:
  path-segment-plural: error
```

Another example configuration:

```yaml
rules:
  path-segment-plural:
    severity: error
    ignoreLastPathSegment: true
    exceptions:
      - v1
      - v2
      - people
```

## Examples

Given this configuration:

```yaml
rules:
  path-segment-plural: error
```

Example of an **incorrect** path segment:

```yaml
paths:
  /customer/{id}:
    post:
      parameters:
        - name: id
          in: path
          required: true
```

Example of a **correct** path segment:

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

- [path-excludes-patterns](./path-excludes-patterns.md)
- [paths-kebab-case](./paths-kebab-case.md)
- [custom rules](./custom-rules.md)

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/common/path-segment-plural.ts)
- [Paths docs](https://redocly.com/docs/openapi-visual-reference/paths/)
