---
slug: /docs/cli/rules/oas/no-duplicated-tag-names
---

# no-duplicated-tag-names

Ensures that tag names in the `tags` array are unique.
This rule prevents duplication of tag names which could lead to inconsistent API documentation.

| OAS | Compatibility |
| --- | ------------- |
| 2.0 | ✅            |
| 3.0 | ✅            |
| 3.1 | ✅            |

## API design principles

Tags are used to group operations in OpenAPI specifications.
Create unique tags to clearly categorize operations.
Having duplicate tags can cause confusion in documentation rendering tools, makes the specification harder to maintain,
and may lead to operations being grouped incorrectly.

## Configuration

| Option     | Type    | Description                                                                                                                                                                  |
| ---------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| severity   | string  | Possible values: `off`, `warn`, `error`. Default `warn` (in `recommended` configuration).                                                                                    |
| ignoreCase | boolean | Possible values: `true`, `false`. Default `false` (in `recommended` configuration). Set to `true` to treat tags with different casing as duplicates (e.g., "Pet" and "pet"). |

An example configuration:

```yaml
rules:
  no-duplicated-tag-names: error
```

Configuration that ignores case:

```yaml
rules:
  no-duplicated-tag-names:
    severity: error
    ignoreCase: true
```

## Examples

Given this configuration:

```yaml
rules:
  no-duplicated-tag-names: error
```

Example of **incorrect** tags:

```yaml Bad example
tags:
  - name: pet
    description: Everything about your Pets
  - name: store
    description: Access to Petstore orders
  - name: store
    description: Duplicated store tag
```

Example of **correct** tags:

```yaml Good example
tags:
  - name: pet
    description: Everything about your Pets
  - name: store
    description: Access to Petstore orders
  - name: user
    description: Operations about user
```

With `ignoreCase: true`, this would also be incorrect:

```yaml
tags:
  - name: pet
    description: Everything about your Pets
  - name: store
    description: Access to Petstore orders
  - name: Store
    description: Case-sensitive duplicate
```

## Related rules

- [tag-description](./tag-description.md)

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/common/no-duplicated-tag-names.ts)
- [Tags docs](https://redocly.com/docs/openapi-visual-reference/tags/)
