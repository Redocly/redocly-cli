# sourceDescriptions-not-empty

The Source Description must have at least one entry.

| Arazzo | Compatibility |
| ------ | ------------- |
| 1.0.0  | ✅            |

## API design principles

According to the Arazzo spec `sourceDescriptions` is required and the list must have at least one entry.

## Configuration

| Option   | Type   | Description                                             |
| -------- | ------ | ------------------------------------------------------- |
| severity | string | Possible values: `off`, `warn`, `error`. Default `off`. |

An example configuration:

```yaml
rules:
  sourceDescriptions-not-empty: error
```

## Examples

Given the following configuration:

```yaml
rules:
  sourceDescriptions-not-empty: error
```

Example of an **incorrect** usage:

```yaml Incorrect example
arazzo: '1.0.0'
info:
  title: Cool API
  version: 1.0.0
  description: A cool API
sourceDescriptions: []
workflows:
  - workflowId: get-museum-hours
      description: This workflow demonstrates how to get the museum opening hours and buy tickets.
      parameters:
      - in: header
          name: Authorization
          value: Basic Og==
      steps:
      - stepId: get-museum-hours
          description: >-
            Get museum hours by resolving request details with getMuseumHours operationId from openapi.yaml description.
          operationId: $sourceDescriptions.museum-api.getMuseumHours
          successCriteria:
          - condition: $statusCode == 200
```

Example of a **correct** usage:

```yaml Correct example
arazzo: '1.0.0'
info:
  title: Cool API
  version: 1.0.0
  description: A cool API
sourceDescriptions:
  - name: museum-api
    type: openapi
    url: openapi.yaml
  - name: another-api
    type: openapi
    url: openapi.yaml
workflows:
  - workflowId: get-museum-hours
    description: This workflow demonstrates how to get the museum opening hours and buy tickets.
    parameters:
      - in: header
        name: Authorization
        value: Basic Og==
    steps:
      - stepId: get-museum-hours
        description: >-
          Get museum hours by resolving request details with getMuseumHours operationId from openapi.yaml description.
        operationId: $sourceDescriptions.museum-api.getMuseumHours
        successCriteria:
          - condition: $statusCode == 200
```

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/arazzo/sourceDescriptions-not-empty.ts)
