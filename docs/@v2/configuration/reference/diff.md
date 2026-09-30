# `diff`

## Introduction

The `diff` configuration section sets the impact that each [diff rule](../../rules/diff-rules.md) gives to a change.
The [`diff` command](../../commands/diff.md) uses these impacts to rate the changes between two API descriptions.
Configure the built-in diff rules and the [diff rules from plugins](../../custom-plugins/custom-diff-rules.md) in this section.

Use the `diff` section only at the root of a configuration file.
An [API-specific section](./apis.md) does not support it.

{% admonition type="warning" name="Experimental" %}
The `diff` section is an experimental feature.
It can change in future releases.
{% /admonition %}

## Options

{% table %}

- Option
- Type
- Description

---

- {rule name}
- string
- **REQUIRED**. The impact that the rule gives to a change.
  Must be one of `major`, `minor`, `patch`, or `off`.
  The key is a built-in rule, for example `enum-values-added`, or a rule from a plugin, for example `cafe/tag-removed`.

{% /table %}

To set an impact for one specification version only, use one of these sections with the same options:

- `oas3_0Diff`
- `oas3_1Diff`
- `oas3_2Diff`
- `async3Diff`

## Examples

The following example starts from the `diff-recommended` ruleset, lowers the impact of one rule, and turns off another:

```yaml
extends:
  - diff-recommended
diff:
  enum-values-added: minor
  schema-format-changed: off
```

The following example changes the impact of a rule for OpenAPI 3.1 descriptions only:

```yaml
extends:
  - diff-recommended
oas3_1Diff:
  schema-type-changed: minor
```

## Related options

- [extends](./extends.md) adds the `diff-recommended` ruleset.
- [plugins](./plugins.md) adds diff rules from custom plugins.

## Resources

- See the list of [diff rules](../../rules/diff-rules.md).
- Read the [`diff` command](../../commands/diff.md) documentation.
