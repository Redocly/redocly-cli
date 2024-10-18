# sourceDescriptions-empty

The Source Description object must be defined when `operationId` or `operationPath` is used inside Step to reference the description operation.
`sourceDescriptions` can be undefined in the Arazzo description in case there are no OpenAPI description exist and `x-operation` extension is used inside Step.

| Arazzo | Compatibility |
| ------ | ------------- |
| 1.0.0  | ✅            |

## API design principles

According to the Arazzo spec `sourceDescriptions` must be described, but to support `x-operation` extension and Arazzo application withotd OpenAPI description it is allowed to not provide `sourceDescriptions` when no `opearationId` or `operationPath` is used.

## Configuration

| Option   | Type   | Description                                             |
| -------- | ------ | ------------------------------------------------------- |
| severity | string | Possible values: `off`, `warn`, `error`. Default `off`. |

An example configuration:

```yaml
rules:
  sourceDescriptions-empty: error
```

## Examples

Given the following configuration:

```yaml
rules:
  sourceDescriptions-empty: error
```

Example of an **incorrect** usage:

```yaml Incorrect example
arazzo: '1.0.0'
info:
  title: Cool API
  version: 1.0.0
  description: A cool API
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
        x-operation:
          url: https://example.com
          method: GET
        successCriteria:
          - condition: $statusCode == 200
```

or

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

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/arazzo/sourceDescriptions-empty.ts)
