# Extend included or existing configuration

Use `extends` to use the built-in configurations and other configuration files as the base settings.
If you don't [override this base configuration](#priority-and-overrides), it is used for all APIs specified in your configuration file.

If you don't have a Redocly configuration file, Redocly CLI automatically uses the `recommended` configuration.
To override the default settings, you can either configure different settings for specific rules in the `rules` object, or create your own configuration files and reference them in the `extends` list.

The `extends` list is structured as an array of strings.
It supports the following types of values:

- Built-in ruleset name (`minimal`, `recommended` or `recommended-strict`)
- A plugin's registered configuration name
- Path or URL to another Redocly configuration file containing rules, preprocessors, decorators or custom plugins.

When providing values as URLs, they must be publicly accessible.

```yaml
extends:
  - built-in-configuration-name
  - local-plugin-name/configuration-name
  - ./path/to/another/redocly-configuration.yaml
  - https://url-to-remote/redocly.yaml
```

**See also:** Visit the detailed documentation on how to [use custom plugins to set configuration](../custom-plugins/custom-config.md).

## Nested configuration

Other configuration files linked in the `extends` list of your main Redocly configuration file may contain their own `extends` list.

Custom plugins can't contain the `extends` list because recursive extension is not supported in that case.

The following examples illustrate configuration nesting with multiple configuration files.

Add `extends` to the project `redocly.yaml` file:

```yaml
extends:
  - custom.yaml
```

Define another `extends` and some additional rules in the `custom.yaml` file referenced before:

```yaml
extends:
  - nested.yaml
rules:
  tags-alphabetical: error
  paths-kebab-case: warn
```

The `nested.yaml` file is another Redocly configuration file containing `rules`:

```yaml
rules:
  path-parameters-defined: error
  tag-description: warn
```

## Priority and overrides

In case of conflict, individual API settings specified in the `apis` object always override settings globally specified.

Redocly CLI applies the `extends` configuration in the order in which items are listed, from top to bottom.
The further down an item appears, the higher its priority.

In case of conflicting settings, content in the `rules` and `decorators` objects always overrides any content in the `extends` list.

In the following example, the `rules` object and another configuration file in the `extends` list configure the same rule (`tags-alphabetical`).
Due to the conflict, priority goes to the inline `rules` over the `extends` list, and the `tags-alphabetical` has a resulting severity level of `error`.

Set the `extends` first in `redocly.yaml`, plus any other rules you want to add to the base configuration

```yaml
extends:
  - custom.yaml
rules:
  tags-alphabetical: error
  paths-kebab-case: warn
```

Set up a base configuration with the rules you want to re-use. In this example, the file is called `custom.yaml` (example below) and it's referenced from `redocly.yaml` (above):

```yaml
rules:
  tags-alphabetical: warn
  path-parameters-defined: warn
```

The same approach applies within the `extends` list.
If you have multiple configurations that try to configure the same rule, only the setting from the last configuration in the list applies.

In the following example, Redocly CLI uses the setting for the conflicting `tags-alphabetical` rule from the `testing.yaml` file, because that file is further down in the `extends` list.

This means you can control the priority of configurations by reordering them in the `extends` list, and override all lint configurations (custom and built-in) by specifying individual rule settings in the `rules` object.

The main `redocly.yaml` file:

```yaml
extends:
  - custom.yaml
  - testing.yaml
```

The `custom.yaml` file is included first:

```yaml
rules:
  tags-alphabetical: warn
  paths-kebab-case: warn
```

Then the `testing.yaml` file, which overrides because it's referenced second:

```yaml
rules:
  tags-alphabetical: error
  path-parameters-defined: warn
```

Use the `extends` list with the `rules` configuration to build up the rulesets and overrides as appropriate for your needs.
