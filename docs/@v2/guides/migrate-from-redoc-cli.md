# Migrate to Redocly CLI from redoc-cli

This guide shows how to replace old `redoc-cli` commands with the updated Redocly CLI equivalents. We strongly recommend that all users upgrade as soon as they can.

## Prepare the tools

Visit the [installation page](../installation.md) to find and use an installation method that works for you:

- Install `redocly` as a command (recommended, and used in the other examples in this article)
- Use `npx` to run the command without installing the package
- Use `docker` to run the command

## Replace old commands with new ones

All Redocly CLI commands use a common configuration file. For theme options, linting rules, and other configuration, check out the [configuration documentation](../configuration/index.md) for all the details.

### Publish documentation

Replace existing `redoc-cli build` commands with:

```sh
redocly build-docs openapi.yaml
```

This generates a zero-dependency HTML file with your docs in, named `redoc-static.html` by default.

### Bundle OpenAPI description

If you have your OpenAPI description split between multiple files, replace `redoc-cli bundle` with `redocly bundle`:

```sh
redocly bundle openapi.yaml -o all-in-one.yaml
```

{% admonition type="success" name="Command reference" %}
Details and examples of using `bundle` are on the [`bundle` command page](../commands/bundle.md). Learn more about bundling, dereferencing, and handling unused components.
{% /admonition %}

## Update configuration settings

Some of the configuration options have been updated. This section shows how to check which of your settings should be changed.

### Update renamed and removed options

The `build-docs` command renders the docs with Redoc 3, which renamed or removed some Redoc 2 options.
Check the options you use against the [Redoc migration guide](https://redocly.com/docs/redoc/config-migration).

One of the removed options is `theme`, so `theme.*` settings have no effect.
Customize the appearance with [CSS variables](https://redocly.com/docs/redoc/deployment/html#theme-configuration) in a `<style>` tag of a [custom template](../commands/build-docs.md#use-a-custom-template) instead.

### Update command-line configuration

Replace the `--options.*` prefix with `--openapi.*`.

For example if you used `redoc-cli build openapi.yaml --options.hideSchemaTitles` then the new command would be:

```sh
redocly build-docs openapi.yaml --openapi.hideSchemaTitles
```

### Update configuration file

Configuration belongs in a file named `redocly.yaml`, or in a file name specified with the `--config` command-line parameter. You can read more about the [configuration file structure](../configuration/index.md) in the documentation, and changes between this and older versions are listed here.

Re-name options that begin with `features.openapi.*` to `openapi.*`.
Do this either at the top level of the configuration, or per API.
The following configuration file hides schema titles:

```yaml
openapi:
  hideSchemaTitles: true
```

Define the base customization; older versions of the tools defaulted to using `recommended`, but this is no longer assumed. Set it in `redocly.yaml` like this:

```yaml
extends:
  - recommended
```

## Next steps with Redocly CLI

The newer tool has a lot more functionality than `redoc-cli` had, so explore the rest of the [Redocly CLI documentation](../index.md) to find out more about:

- Ensuring API quality with linting
- Managing large OpenAPI files
- Enhancing an OpenAPI description with decorators

{% admonition type="warning" name="Uninstall" %}
We recommend you uninstall `redoc-cli` now that it is no longer needed.
{% /admonition %}
