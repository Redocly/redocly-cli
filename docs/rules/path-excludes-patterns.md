# path-excludes-patterns

Disallow patterns from paths.

|OAS|Compatibility|
|---|---|
|2.0|✅|
|3.0|✅|
|3.1|✅|



## API design principles

The [`no-http-verbs-in-paths` rule](./no-http-verbs-in-paths.md) is pre-built for a very specific set of patterns.
This rule is the general Swiss army knife version.
If you absolutely know something should not be in the path (for example `foo`), then add the pattern to prevent it.

Ideas for things to prevent in paths besides HTTP verbs include other common CRUD verbs, bad words, and internal code words (food for thought).

Other ideas are around casing (other than kebab-case, which is a common approach and we have [another rule](./paths-kebab-case.md) already prepared for that).

## Configuration


|Option|Type|Description|
|---|---|---|
|severity|string|Possible values: `off`, `warn`, `error`. Default `off` (in `recommended` configuration).
|patterns|[string]|List of patterns to match. For example, `^\/[a-z]`.


An example configuration:

```yaml
rules:
  path-excludes-patterns:
    severity: error
    patterns:
      - ^\/[0-9]
```

## Examples

Given this configuration:

```yaml
rules:
  path-excludes-patterns:
    severity: error
    patterns:
      - ^\/[0-9]
```

Example of an **incorrect** path:

```yaml
paths:
  /1customers/{id}:
    post:
      parameters:
        - name: id
          in: path
          required: true
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
```

## Related rules

- [tag-description](./tag-description.md)
- [operation-description](./operation-description.md)
- [custom rules](./custom-rules.md)

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/common/parameter-description.ts)
- [Paths docs](https://redocly.com/docs/openapi-visual-reference/paths/)
