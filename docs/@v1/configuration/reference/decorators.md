# `decorators`

## Introduction

The `decorators` configuration section defines the transformation steps that are applied to your API description when it is bundled.
Both the [built-in decorators](../../decorators.md) and [decorators from custom plugins](../../custom-plugins/custom-decorators.md) are configured in this section.
The `decorators` block can be used at the root of a configuration file, or inside an [API-specific section](./apis.md).

## Options

{% table %}

- Option
- Type
- Description

---

- {decorator name}
- string _or_ [Decorator object](#decorator-object)
- **REQUIRED**. You can add as many decorators as you wish. The keys must be either built-in decorators (for example `info-description-override`), or a decorator from a plugin (for example `tags-plugin/no-unused-tags`). Set the value to `on` or `off` to enable or disable a decorator, or use a [Decorator object](#decorator-object) to configure additional options for a specific decorator.

{% /table %}

### Decorator object

{% table %}

- Option
- Type
- Description

---

- {additional properties}
- any
- Some decorators support additional configuration, check the documentation for each specific decorator to discover the values that can be used. For example the [`filter-out` decorator](../../decorators/filter-out.md) supports `property` and `value` settings for what to filter.

---

- severity
- string
- Severity level of any problems reported with this decorator. Setting this option is usually only useful for troubleshooting purposes. The value must be one of `error`, `warn`, or `off`, where `off` disables the decorator.

{% /table %}

## Examples

This section covers some examples and common use cases.

### Configure built-in decorators

Pick and mix the built-in decorators in your `redocly.yaml` file as you need to.
The following example enables the `remove-unused-components` decorator, and uses `info-override` to update the title:

```yaml
decorators:
  remove-unused-components: on
  info-override:
    title: Better title than before
```

The `info-override` decorator accepts some additional configuration.

### Configure decorators from custom plugins

Redocly also supports [custom plugins](../../custom-plugins/custom-rules.md) for advanced users.
Decorators in custom plugins are also configured in the `decorators` section of the configuration file, using the plugin's module name as a prefix.

The following example shows enabling a decorator called `alphabetical` from a plugin named `tag-sorting`:

```yaml
plugins:
  - './tag-sorting.js'

decorators:
  tag-sorting/alphabetical: on
```

The example includes adding the plugin, partly to remind you that this is also needed.

## Related options

- [apis](./apis.md) configuration options allow setting per-API configuration in `redocly.yaml`.
- [rules](./rules.md) settings define the linting rules that are used.

## Resources

- Learn more about [decorators](../../decorators.md).
- To build your own decorators, you can use [custom plugins](../../custom-plugins/index.md).
- The [Redocly CLI cookbook](https://github.com/Redocly/redocly-cli-cookbook) is a great resource for learning and sharing decorators and custom plugins.
