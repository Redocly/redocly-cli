---
slug: /docs/cli/rules/oas/spec-no-invalid-tag-parents
---

# spec-no-invalid-tag-parents

Validates that tag parent references are properly defined and don't create circular dependencies.

| OAS | Compatibility |
| --- | ------------- |
| 2.0 | ❌            |
| 3.0 | ❌            |
| 3.1 | ❌            |
| 3.2 | ✅            |

```yaml Object structure
tags:
  - name: string
    parent: string
    description: string
    externalDocs: object
```

```yaml Example
tags:
  - name: products
    description: All products
  - name: books
    parent: products
    description: Books category
```

The default setting for this rule (in the built-in `recommended` configuration) is `error`.

## API design principles

OpenAPI 3.2 introduced the ability to organize tags in a hierarchical structure using the `parent` field.
This rule ensures that:

1. **Parent tags exist**: Any tag referenced as a parent must be defined in the `tags` array.
2. **No circular references**: Tag parent relationships must not create circular dependencies.

Proper tag hierarchy helps organize your API documentation and makes it easier for users to navigate related endpoints.

## Configuration

To configure the rule, add it to the `rules` object in your configuration file.
Set the desired [severity](../../rules.md#severity-settings) for the rule.

```yaml
rules:
  spec-no-invalid-tag-parents: error
```

| Option   | Type   | Description                                                                                |
| -------- | ------ | ------------------------------------------------------------------------------------------ |
| severity | string | Possible values: `off`, `warn`, `error`. Default `error` (in `recommended` configuration). |

An example configuration:

```yaml
rules:
  spec-no-invalid-tag-parents: error
```

## Examples

Given this configuration:

```yaml
rules:
  spec-no-invalid-tag-parents: error
```

Example of **incorrect** tags (undefined parent):

```yaml
tags:
  - name: books
    parent: products
```

Example of **incorrect** tags (circular reference):

```yaml
tags:
  - name: comics
    parent: books
  - name: books
    parent: comics
```

Example of **correct** tags:

```yaml
tags:
  - name: products
  - name: books
    parent: products
```

## Related rules

- [no-duplicated-tag-names](./no-duplicated-tag-names.md)
- [operation-tag-defined](./operation-tag-defined.md)

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/oas3/spec-no-invalid-tag-parents.ts)
- [Tags docs](https://redocly.com/docs/openapi-visual-reference/tags/)
