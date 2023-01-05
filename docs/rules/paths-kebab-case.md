# paths-kebab-case

Require kebab-case in paths instead of camelCase or snake_case.

|OAS|Compatibility|
|---|---|
|2.0|✅|
|3.0|✅|
|3.1|✅|


## API design principles

The base URL is case insensitive.
The paths are case sensitive.
It's a good practice to NOT confuse anyone, including yourself, with that fact, by using lowercase paths.

However, whatsapersontodowhenapathbecomesreallyhardtoread?
Use the de facto standard of kebab-case.

Let's see if that question from above is easier to read this time around: whats-a-person-to-do-when-a-path-becomes-really-hard-to-read?
Much better.

Don't adhere to this rule at your own risk.
We don't want to say we told ya so!

## Configuration


|Option|Type|Description|
|---|---|---|
|severity|string|Possible values: `off`, `warn`, `error`. Default `off` (in `recommended` configuration). |

An example configuration:

```yaml
rules:
  paths-kebab-case: error
```

## Examples


Given this configuration:

```yaml
rules:
  paths-kebab-case: error
```

Example of an **incorrect** path:

```yaml
paths:
  /customer_orders/{id}:
    post:
      parameters:
        - name: id
          in: path
          required: true
```

Example of a **correct** path:

```yaml
paths:
  /customer-orders/{id}:
    post:
      parameters:
        - name: id
          in: path
          required: true
          description: The customer's ID.
```

## Related rules

- [path-excludes-patterns](./path-excludes-patterns.md)
- [paths-segment-plural](./path-segment-plural.md)
- [custom rules](./custom-rules.md)

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/common/paths-kebab-case.ts)
- [Paths docs](https://redocly.com/docs/openapi-visual-reference/paths/)
