# sourceDescriptions-name-unique

The `name` property of the Source Description object must be unique across all source descriptions..

| Arazzo | Compatibility |
| ------ | ------------- |
| 1.0.0  | ✅            |

## API design principles

To avoid confusion or unexpected outputs, each Source Description object should have a unique `name` property.

## Configuration

| Option   | Type   | Description                                             |
| -------- | ------ | ------------------------------------------------------- |
| severity | string | Possible values: `off`, `warn`, `error`. Default `off`. |

An example configuration:

```yaml
arazzoRules:
  sourceDescriptions-name-unique: error
```

## Examples

Given the following configuration:

```yaml
arazzoRules:
  sourceDescriptions-name-unique: error
```

Example of an **incorrect** `sourceDescriptions` list:

```yaml Incorrect example
sourceDescriptions:
  - name: museum-api
    type: openapi
    url: ../openapi.yaml
  - name: museum-api
    type: openapi
    url: ../petstore.yaml
```

Example of a **correct** `sourceDescriptions` list:

```yaml Correct example
sourceDescriptions:
  - name: museum-api
    type: openapi
    url: ../openapi.yaml
  - name: pets-api
    type: openapi
    url: ../petstore.yaml
```

## Related rules

- [sourceDescription-type](./sourceDescriptions-type.md)

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/arazzo/sourceDescriptions-name-unique.ts)
