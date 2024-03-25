# `extends`

## Introduction

The `extends` configuration entry allows your project configuration to extend an existing configuration set.
Multiple values are supported, and can include:

- the name of a [built-in ruleset](../../rules.md#rulesets)
- configuration defined in a [custom plugin](../../custom-plugins/index.md)
- a path or URL to another `redocly.yaml` file

Extends is useful if you use a common ruleset across multiple projects.
Define a ruleset in one location, and each project can `extend` it, with or without modification.

{% admonition type="info" name="Default ruleset: recommended" %}
If there is no `redocly.yaml` configuration file, the [recommended ruleset](../../rules/recommended.md) is used by default.
{% /admonition %}

## Options

The `extends` configuration is an array of strings.

The array is parsed in the order it is defined, so the later entries in the array overwrite the earlier ones.

## Examples

To get started, try the following example to configure your project to be based on the [minimal ruleset](../../rules/minimal.md):

```yaml
extends:
 - minimal
```

## Related options

- [apis](./apis.md) configuration options allow setting per-API configuration in `redocly.yaml`.
- [rules](./rules.md) settings define the linting rules that are used.

## Resources

- Detailed documentation and examples on [extending configuration](../extends.md).
