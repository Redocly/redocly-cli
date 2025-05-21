---
slug: /docs/cli/rules/respect/no-x-security-scheme-name-in-workflow
---

# no-x-security-scheme-name-in-workflow

The `x-security` can't use `schemeName` when described on `workflow` level.

| Arazzo | Compatibility |
| ------ | ------------- |
| 1.x    | ✅            |

## API design principles

This is `Respect` specific rule.
Workflow does not have a direct connection to OpenAPI operation, so it is not allowed to reference `schemeName` inside `x-security` extension.

## Configuration

| Option   | Type   | Description                                             |
| -------- | ------ | ------------------------------------------------------- |
| severity | string | Possible values: `off`, `warn`, `error`. Default `off`. |

An example configuration:

```yaml
arazzoRules:
  no-x-security-scheme-name-in-workflow: error
```

## Examples

Given the following configuration:

```yaml
arazzoRules:
  no-x-security-scheme-name-in-workflow: error
```

Example of a **correct** entry:

```yaml
workflows:
  - workflowId: workflowId
    x-security:
      - scheme:
          type: http
          scheme: basic
        values:
          username: test@example.com
          password: 123456
    steps:
      - stepId: step-without-openapi-operation-and-security-scheme-name
        x-operation:
          method: GET
          url: https://api.example.com/v1/users
```

Example of a **incorrect** entry:

```yaml
workflows:
  - workflowId: workflowId
    x-security:
      - schemeName: MuseumPlaceholderAuth
        values:
          username: test@example.com
          password: 123456
    steps:
      - stepId: step-without-openapi-operation-and-security-scheme-name
        x-operation:
          method: GET
          url: https://api.example.com/v1/users
```

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/respect/no-x-security-scheme-name-in-workflow.ts)
