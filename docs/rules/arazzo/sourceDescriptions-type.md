# sourceDescriptions-type

The `type` property of the Source Description object must be either `openapi` or `arazzo`.

| Arazzo | Compatibility |
| ------ | ------------- |
| 1.0.0  | ✅            |

## API design principles

According to the Arazzo spec, the possible values of the Source Description `type` are `openapi` or `arazzo`.

## Configuration

| Option   | Type   | Description                                             |
| -------- | ------ | ------------------------------------------------------- |
| severity | string | Possible values: `off`, `warn`, `error`. Default `off`. |

An example configuration:

```yaml
rules:
  sourceDescriptions-type: error
```

## Examples

Given the following configuration:

```yaml
rules:
  sourceDescriptions-type: error
```

Example of an **incorrect** `sourceDescriptions` list:

```yaml Incorrect example
sourceDescriptions:
  - name: museum-api
    type: openapi
    url: ../openapi.yaml
  - name: tickets-from-museum-api
    type: none
    x-serverUrl: 'http://localhost/api'
```

Example of a **correct** `sourceDescriptions` list:

```yaml Correct example
sourceDescriptions:
  - name: museum-api
    type: openapi
    url: ../openapi.yaml
  - name: tickets-from-museum-api
    type: arazzo
    url: museum-tickets.arazzo.yaml
```

## Related rules

- [sourceDescription-name-unique](./sourceDescriptions-name-unique.md)

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/arazzo/sourceDescription-type.ts)
