---
slug: /docs/cli/v2/rules/overlay/struct
---

# struct

Ensures that your API document conforms to the [Overlay specification](https://spec.openapis.org/overlay/latest.html#Overlay-specification).

| Overlay | Compatibility |
| ------- | ------------- |
| 1.x     | ✅            |

## API design principles

It's important to conform to the specification so that tools work with your Overlay document.
Doing so makes writing and maintenance of Overlay documents easier.

## Configuration

| Option   | Type   | Description                                                                                |
| -------- | ------ | ------------------------------------------------------------------------------------------ |
| severity | string | Possible values: `off`, `warn`, `error`. Default `error` (in `recommended` configuration). |

The default setting for this rule (in the `recommended` and `minimal` configuration) is `error`.

This is an essential rule. Do not turn it off, except in rare and special cases.

An example configuration:

```yaml
rules:
  struct: error
```

## Examples

Given this configuration:

```yaml
rules:
  struct: error
```

Example of an **incorrect** Overlay document, with no `title` in `info`:

```yaml
overlay: 1.0.0
info:
  version: 1.0.0
actions:
  - target: $.info
    update:
      description: An updated description.
```

Example of a **correct** Overlay document:

```yaml
overlay: 1.0.0
info:
  title: Ultra overlay
  version: 1.0.0
actions:
  - target: $.info
    update:
      description: An updated description.
```

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/common/struct.ts)
- [Overlay specification](https://spec.openapis.org/overlay/latest.html)
