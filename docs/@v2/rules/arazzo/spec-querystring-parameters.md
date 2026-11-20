# spec-querystring-parameters

Enforces valid use of `querystring` parameters in a step.

| Arazzo | Compatibility |
| ------ | ------------- |
| 1.0.x  | ❌            |
| 1.1.x  | ✅            |

## Design principles

Arazzo 1.1.0 adds the `querystring` parameter location, which passes the whole query string of a request as one value.
A request has one query string, so a step cannot send two of them, or send one together with separate `query` parameters.

This rule checks the parameters of each step together with the parameters of its workflow, and reports:

- A second parameter with `in: querystring`.
- A parameter with `in: query` used together with a parameter with `in: querystring`.

A step parameter replaces the workflow parameter with the same `name` and `in`, so the rule does not count the replaced one.
The rule skips a step that uses `workflowId`, because its parameters are the inputs of that workflow.

## Configuration

| Option   | Type   | Description                                                                                |
| -------- | ------ | ------------------------------------------------------------------------------------------ |
| severity | string | Possible values: `off`, `warn`, `error`. Default `error` (in `recommended` configuration). |

An example configuration:

```yaml
rules:
  spec-querystring-parameters: error
```

## Examples

Given the following configuration:

```yaml
rules:
  spec-querystring-parameters: error
```

Example of an **incorrect** step that mixes `querystring` with `query`:

```yaml Incorrect example
workflows:
  - workflowId: list-menu
    steps:
      - stepId: list-menu-items
        operationId: cafe-api.listMenuItems
        parameters:
          - in: querystring
            name: filters
            value: search=latte
          - in: query
            name: limit
            value: 1
```

Example of a **correct** step that passes the whole query string in one parameter:

```yaml Correct example
workflows:
  - workflowId: list-menu
    steps:
      - stepId: list-menu-items
        operationId: cafe-api.listMenuItems
        parameters:
          - in: querystring
            name: filters
            value: search=latte&limit=1
```

## Related rules

- [parameters-unique](./parameters-unique.md)
- [spec-querystring-parameters for OpenAPI](../oas/spec-querystring-parameters.md)

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/arazzo/spec-querystring-parameters.ts)
