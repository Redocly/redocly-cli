---
slug: /docs/cli/v1/rules/respect/no-criteria-xpath
---

# no-criteria-xpath

The `xpath` type criteria is not supported by Respect.

| Arazzo | Compatibility |
| ------ | ------------- |
| 1.x    | ✅            |

## API design principles

This is `Respect` specific rule.
The `xpath` type criteria is not supported by Respect.

## Configuration

| Option   | Type   | Description                                             |
| -------- | ------ | ------------------------------------------------------- |
| severity | string | Possible values: `off`, `warn`, `error`. Default `off`. |

An example configuration:

```yaml
rules:
  no-criteria-xpath: error
```

## Examples

Given the following configuration:

```yaml
rules:
  no-criteria-xpath: error
```

Example of criteria:

```yaml Object example
successCriteria:
  - condition: $statusCode == 201
  - context: $response.body
    condition: $.name == 'Mermaid Treasure Identification and Analysis'
    type:
      type: jsonpath
      version: draft-goessner-dispatch-jsonpath-00
```

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/respect/no-criteria-xpath.ts)
