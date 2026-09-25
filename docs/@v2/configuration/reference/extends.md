# `extends`

## Introduction

The `extends` configuration entry allows your project configuration to extend an existing configuration set.
Multiple values are supported, and can include:

- the name of a [built-in ruleset](../../rules.md#rulesets)
- configuration defined in a [custom plugin](../../custom-plugins/index.md)
- a path or URL to another `redocly.yaml` file

Entries that start with `recheck/`, such as `recheck/markdown`, are presets for the [`recheck`](../../commands/recheck.md) command.
They are the configs of the built-in `recheck` plugin.
`extends` resolves them the same way as any other plugin config.
A custom plugin cannot use the id `recheck`.

The [`recheck` block](recheck.md) merges on top of the presets.
The `recheck` command reads the presets in the root `extends` and in the files that the root `extends` lists.
It does not read them from an API's `extends`.
The `lint` command reads no rules from them.

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
