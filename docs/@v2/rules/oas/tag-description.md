---
slug: /docs/cli/v2/rules/oas/tag-description
---

# tag-description

Requires that the tags all have a non-empty `description`.

| OAS | Compatibility |
| --- | ------------- |
| 2.0 | ✅            |
| 3.0 | ✅            |
| 3.1 | ✅            |

```yaml Object structure
tags:
  - name: string
    description: string
    externalDocs: object
```

```yaml Example
tags:
  - name: Partner APIs
    description: Endpoints used for integrations with partners and external collaborators.
  - name: Customer APIs
    description: Endpoints used for integrations with customers.

```

The default setting for this rule (in the built-in `recommended` configuration) is `warn`.

## API design principles

Verifies that each tag has a description because documentation!
Did we say documentation?
Documentation!

Remember folks, we use docs-as-code to write the docs, but the docs are the product, and your product should have a description.

## Configuration

To configure the rule, add it to the `rules` object in your configuration file.
Set the desired [severity](../../rules.md#severity-settings) for the rule.

```yaml
rules:
  tag-description: error
```

| Option   | Type   | Description                                                                              |
| -------- | ------ | ---------------------------------------------------------------------------------------- |
| severity | string | Possible values: `off`, `warn`, `error`. Default `off` (in `recommended` configuration). |

An example configuration:

```yaml
rules:
  tag-description: error
```

## Examples

Given this configuration:

```yaml
rules:
  tag-description: error
```

Example of **incorrect** tags:

```yaml Example
tags:
  - name: Partner APIs
  - name: Customer APIs
```

Example of **correct** tags:

```yaml Example
tags:
  - name: Partner APIs
    description: Endpoints used for integrations with partners and external collaborators.
  - name: Customer APIs
    description: Endpoints used for integrations with customers.
```

## Related rules

- [tags-alphabetical](./tags-alphabetical.md)
- [operation-description](./operation-description.md)
- [configurable rules](../configurable-rules.md)

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/common/tag-description.ts)
- [Tags docs](https://redocly.com/docs/openapi-visual-reference/tags/)
