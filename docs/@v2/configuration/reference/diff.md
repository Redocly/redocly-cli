# `diff`

## Introduction

The `diff` section sets the impact of each [diff rule](../../rules/diff-rules.md).
The [`diff` command](../../commands/diff.md) uses these impacts.

Use the `diff` section only at the root of a configuration file.
[API-specific sections](./apis.md) do not support it.

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
- **REQUIRED**. The impact of the changes that the rule reports.
  Possible values: `major`, `minor`, `patch`, `off`.

{% /table %}

To set an impact for one specification version, use one of these sections.
They have the same options.

- `oas3_0Diff`
- `oas3_1Diff`
- `oas3_2Diff`
- `async3Diff`

## Examples

This example adds the `diff-recommended` ruleset, sets a lower impact for one rule, and turns off another rule:

```yaml
extends:
  - diff-recommended
diff:
  enum-values-added: minor
  schema-constraint-changed: off
```

This example changes the impact of a rule for OpenAPI 3.1 descriptions only:

```yaml
extends:
  - diff-recommended
oas3_1Diff:
  schema-type-changed: minor
```

## Related options

- [extends](./extends.md) adds the `diff-recommended` ruleset.

## Resources

- [Diff rules](../../rules/diff-rules.md)
- [`diff` command](../../commands/diff.md)
