# workflow-dependsOn

Requires the items in the `workflow` `dependsOn` property to exist and to be unique.

| Arazzo | Compatibility |
| ------ | ------------- |
| 1.x    | ✅            |

## Design principles

To avoid ambiguity or potential clashes, the `dependsOn` list values should be unique.

## Configuration

| Option   | Type   | Description                                             |
| -------- | ------ | ------------------------------------------------------- |
| severity | string | Possible values: `off`, `warn`, `error`. Default `off`. |

An example configuration:

```yaml
rules:
  workflow-dependsOn: error
```

## Examples

Given the following configuration:

```yaml
rules:
  workflow-dependsOn: error
```

Example of a **correct** `dependsOn` list:

```yaml Correct example
workflows:
    - workflowId: get-museum-hours
      description: This workflow demonstrates how to get the museum opening hours and buy tickets.
      dependsOn:
        - get-museum-hours-2
        - get-museum-hours-3
```

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/arazzo/workflow-dependsOn.ts)
