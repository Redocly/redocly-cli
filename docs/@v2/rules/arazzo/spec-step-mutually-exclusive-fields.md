# spec-step-mutually-exclusive-fields

A step must use only one of its mutually exclusive operation fields.

| Arazzo | Compatibility |
| ------ | ------------- |
| 1.x    | ✅            |

## Design principles

The Arazzo specification defines several fields that point a step to the operation or workflow it executes.
These fields are mutually exclusive: a step must reference exactly one of them.
This rule reports a step that uses more than one of these fields at the same time.

In Arazzo 1.0.x, the mutually exclusive fields are: `operationId`, `operationPath`, `workflowId`.
In Arazzo 1.1.0, `operationId`, `operationPath`, `workflowId`, and `channelPath` are mutually exclusive.

## Configuration

| Option   | Type   | Description                                             |
| -------- | ------ | ------------------------------------------------------- |
| severity | string | Possible values: `off`, `warn`, `error`. Default `off`. |

An example configuration:

```yaml
rules:
  spec-step-mutually-exclusive-fields: error
```

## Examples

Given the following configuration:

```yaml
rules:
  spec-step-mutually-exclusive-fields: error
```

Example of an **incorrect** step that uses two mutually exclusive fields:

```yaml Incorrect example
workflows:
  - workflowId: place-order
    steps:
      - stepId: list-menu-items
        operationId: cafe-api.listMenuItems
        workflowId: place-order
```

Example of a **correct** step that uses a single operation field:

```yaml Correct example
workflows:
  - workflowId: place-order
    steps:
      - stepId: list-menu-items
        operationId: cafe-api.listMenuItems
```

## Related rules

- [sourceDescription-type](./sourceDescription-type.md)

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/arazzo/spec-step-mutually-exclusive-fields.ts)
