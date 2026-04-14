# outputs-defined

The output value should be defined before usage.

| Arazzo | Compatibility |
| ------ | ------------- |
| 1.x    | ✅            |

## Design principles

In Arazzo, every `outputs` mapping—linking a friendly name to a dynamic output value—must be explicitly defined before it is referenced or used elsewhere in the description.

## Configuration

| Option   | Type   | Description                                             |
| -------- | ------ | ------------------------------------------------------- |
| severity | string | Possible values: `off`, `warn`, `error`. Default `off`. |

An example configuration:

```yaml
rules:
  outputs-defined: error
```

## Examples

Given the following configuration:

```yaml
rules:
  outputs-defined: error
```

Example of a **correct** `outputs` description:

```yaml Correct example
workflows:
  - workflowId: events-crud
    steps:
      - stepId: create-event
        operationPath: $sourceDescriptions.museum-api#/paths/~1special-events/post
        requestBody:
          payload:
            name: 'Mermaid Treasure Identification and Analysis'
            description: 'Identify and analyze mermaid treasures'
        outputs:
          specialEventId: $response.body#/id
    outputs:
      createdEventId: $steps.create-event.outputs.specialEventId
```

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/arazzo/outputs-defined.ts)
