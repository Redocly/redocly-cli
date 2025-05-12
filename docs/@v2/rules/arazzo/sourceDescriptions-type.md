# sourceDescriptions-type

The `type` property of the Source Description object must be either `openapi` or `arazzo`.

| Arazzo | Compatibility |
| ------ | ------------- |
| 1.x    | ✅            |

## Design principles

Arazzo currently supports either an OpenAPI file or another Arazzo file as the source description.
This rule makes sure that the type is clearly identified and is one of the supported types.

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
