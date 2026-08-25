---
slug: /docs/cli/rules/common/no-unsafe-markdown
---

# no-unsafe-markdown

Disallows potentially executable content in `description` fields.

| OAS | Compatibility |
| --- | ------------- |
| 2.0 | ✅            |
| 3.0 | ✅            |
| 3.1 | ✅            |
| 3.2 | ✅            |

| AsyncAPI | Compatibility |
| -------- | ------------- |
| 2.6      | ✅            |
| 3.0      | ✅            |

| Arazzo | Compatibility |
| ------ | ------------- |
| 1.0    | ✅            |

## API design principles

Description fields support Markdown and are rendered by documentation tools.
Embedded `<script>` tags, HTML event handler attributes (such as `onerror`), and `javascript:` URLs can execute in the reader's browser, which makes them a cross-site scripting risk —
especially when parts of the API description come from external sources.
This rule flags the common patterns, but it doesn't replace HTML sanitization in the rendering tool.
Keep executable code out of descriptions.

## Configuration

| Option   | Type   | Description                                                                                  |
| -------- | ------ | -------------------------------------------------------------------------------------------- |
| severity | string | Possible values: `off`, `warn`, `error`. Default is `warn` in the recommended configuration. |

Example configuration:

```yaml
rules:
  no-unsafe-markdown: error
```

## Examples

Examples of **incorrect** Markdown in `description` fields :

```yaml
info:
  description: Contains a malicious script tag <script>alert('hello')</script>
```

```yaml
info:
  description: Contains an event handler <img src=x onerror=alert('hello')>
```

```yaml
info:
  description: Contains a malicious link [click](javascript:alert('hello'))
```

Example of **correct** Markdown in `description` fields:

```yaml
info:
  description: Plain text, no executable code.
```

## Related rules

- [no-enum-type-mismatch](./no-enum-type-mismatch.md)
- [configurable rules](../configurable-rules.md)

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/common/no-unsafe-markdown.ts)
