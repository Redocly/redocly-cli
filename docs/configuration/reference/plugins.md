# `plugins`

## Introduction

Redocly supports [custom plugins](../../custom-plugins/index.md) for extending lint and decorator behavior.
Use plugins when you need to add rules beyond the [built-in](../../rules/built-in-rules.md) and [configurable](../../rules/configurable-rules.md), or decorators beyond the [built-in decorators](../../decorators.md).

## Options

The `plugins` configuration is an array of paths to plugin files, relative to the config file.
You can include as many plugins as you need.

## Examples

A basic example of including two plugins from a directory named `plugins/` is shown in the example below:

```yaml
plugins:
  - plugins/my-best-plugin.js
  - plugins/another-plugin.js
```

Remember that you need to include plugins in the `plugins` section before you can use the content of the plugin elsewhere in the configuration file.

## Related options

- [apis](./apis.md) configuration options allow setting per-API configuration in `redocly.yaml`.
- [rules](./rules.md) settings define the linting rules that are used.
- [decorators](./decorators.md) offer some transformations for your OpenAPI documents.

## Resources

- The [Redocly CLI cookbook](https://redocly.com/blog/redocly-cli-cookbook/) has many examples of plugins.
- Read more [configuration examples](../index.md).
