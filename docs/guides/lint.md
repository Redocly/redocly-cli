---
redirectFrom:
  - /docs/cli/configuration/lint/
---

# Manage the lint configuration

The `lint` configuration is part of the [Redocly configuration file](../configuration/index.mdx).
Redocly CLI commands use this configuration to control various options.

The Redocly configuration file supports global lint settings (configured in the top-level `lint` object) and per-API lint settings (configured in the `lint` objects for individual APIs).

```yaml
apis:
  main@v1:
    root: ./openapi/openapi.yaml
    styleguide:
      rules: []
      (...)
styleguide:
  rules: []
  (...)
```

If `lint` is not defined for an API, global settings are used.
If `lint` is defined for an API, its settings apply together with the global configuration.
If per-API and global settings modify the same properties, per-API settings will override global settings.

The `lint` configuration consists of several lists and objects. The following code block shows an example `lint` configuration. Its contents are described further in the text.

```yaml
styleguide:
  plugins:
    - './local-plugin.js'
  extends:
    - recommended
  rules:
    no-sibling-refs:
      severity: error
    boolean-parameter-prefixes:
      severity: error
      prefixes: ['should', 'is', 'has']
  ...
```

:::attention Per-API support

The `lint` configuration only supports `extends`, `rules` and `decorators` when used per-API.

You can't use `plugins` in per-API settings.

:::


## Plugins

Use this list to import local plugins. If you don't have any custom plugins, omit this list.

* **type**: `array of strings`

:::warning

You don't need to import built-in plugins and rules.

Community plugins are not supported.

:::

### Examples

```yaml Import a single plugin
styleguide:
  plugins:
    - './local-plugin.js'
```

```yaml Import multiple plugins
styleguide:
  plugins:
    - ['./local-plugin.js', './another-local-plugin.js']
```

## Extends

Use `extends` to list built-in configurations, plugin configurations, and other configuration files as the base settings for validating your API definitions.
If you don't [override this base configuration](#priority-and-overrides), it is used for all APIs specified in your configuration file.

If you omit the `extends` list or if you don't have a Redocly configuration file, Redocly CLI automatically uses the `recommended` [built-in configuration](#built-in-configurations).
To override the default settings, you can either configure different settings for specific rules in the `lint.rules` object, or create your own configuration files and reference them in the `extends` list.


:::warning Important

This behavior with automatically defaulting to the `recommended` configuration is deprecated, and will change in the stable Redocly CLI release.

After the change, `extends` will have to be explicitly defined in the main configuration file for any extended configuration to apply.

:::


The `extends` list is structured as an array of strings.
It supports the following types of values:

- Built-in configuration name (`minimal`, `recommended`, `all`)
- A local plugin's registered configuration name
- Path or URL to another Redocly configuration file

When providing values as URLs, they must be publicly accessible.

```yaml
styleguide:
  extends:
    - built-in-configuration-name
    - local-plugin-name/configuration-name
    - ./path/to/another/redocly-configuration.yaml
    - https://url-to-remote/redocly.yaml
```

To prevent malicious code execution, custom plugins can't be imported from URLs, only from local files.
Find more information on the [Configs in plugins](../resources/custom-rules.md#configs-in-plugins) page.


### Built-in configurations

Redocly CLI comes with 3 built-in configurations, and their content is visible in the source code:


- [minimal](https://github.com/Redocly/redocly-cli/blob/master/packages/core/src/config/minimal.ts)
- [recommended](https://github.com/Redocly/redocly-cli/blob/master/packages/core/src/config/recommended.ts)
- [all](https://github.com/Redocly/redocly-cli/blob/master/packages/core/src/config/all.ts) - enables all built-in rules


Built-in configurations are not meant to be modified by users.


### Other configuration files

Any additional configuration must be in a YAML file, and must conform to the Redocly configuration file syntax.

**Example: using an additional configuration file**

```yaml Main redocly.yaml
styleguide:
  extends:
    - ./other-configuration.yaml
```

```yaml Linked other-configuration.yaml
styleguide:
  rules:
    tags-alphabetical: error
    no-invalid-schema-examples:
      severity: warn
      disallowAdditionalProperties: false
    paths-kebab-case: warn
```


If you add another Redocly configuration file to the `extends` list, the settings from its `lint` object are merged with your main Redocly configuration file.

**Example: using an additional configuration file**

```yaml Main redocly.yaml
styleguide:
  extends:
    - ./testing/redocly.yaml
```

```yaml /testing/redocly.yaml
apis:
  testing-api:
    (...)
styleguide:
  rules:
    tags-alphabetical: error
    no-invalid-schema-examples:
      severity: warn
      disallowAdditionalProperties: false
    paths-kebab-case: warn
features.openapi:
  schemaExpansionLevel: 4
  (...)
```


### Nested configuration

Other configuration files linked in the `extends` list of your main Redocly configuration file may contain their own `extends` list.

Custom plugins can't contain the `extends` list because recursive extension is not supported in that case.

The following examples illustrate configuration nesting with multiple configuration files.

```yaml Main redocly.yaml
styleguide:
  extends:
    - custom.yaml
```

```yaml custom.yaml
styleguide:
  extends:
    - nested.yaml
  rules:
    tags-alphabetical: error
    paths-kebab-case: warn
```

```yaml nested.yaml
styleguide:
  rules:
    path-parameters-defined: error
    tag-description: warn
```


### Priority and overrides

In case of conflict, individual API settings specified in the `apis` object always override settings specified in the global `lint` object.

Redocly CLI applies the `extends` configuration in the order in which items are listed, from top to bottom.
The further down an item appears, the higher its priority.

In case of conflicting settings, content in the `rules` and `decorators` objects always overrides any content in the `extends` list.

In the following example, the `rules` object and another configuration file in the `extends` list configure the same rule (`tags-alphabetical`).
Due to the conflict, priority goes to the inline `rules` over the `extends` list, and the `tags-alphabetical` has a resulting severity level of `error`.


```yaml redocly.yaml
styleguide:
  extends:
    - custom.yaml
  rules:
    tags-alphabetical: error
    paths-kebab-case: warn
```

```yaml custom.yaml
styleguide:
  rules:
    tags-alphabetical: warn
    path-parameters-defined: warn
```


The same approach applies within the `extends` list.
If you have multiple configurations that try to configure the same rule, only the setting from the last configuration in the list will apply.

In the following example, Redocly CLI will use the setting for the conflicting `tags-alphabetical` rule from the `testing.yaml` file, because that file is further down in the `extends` list.

This means you can control the priority of configurations by reordering them in the `extends` list, and override all lint configurations (custom and built-in) by specifying individual rule settings in the `rules` object.

```yaml redocly.yaml
styleguide:
  extends:
    - custom.yaml
    - testing.yaml
```

```yaml custom.yaml
styleguide:
  rules:
    tags-alphabetical: warn
    paths-kebab-case: warn
```

```yaml testing.yaml
styleguide:
  rules:
    tags-alphabetical: error
    path-parameters-defined: warn
```


## Preprocessors

As preprocessors are rarely indicated, you can omit this object in most cases.

* **type**: `array of objects`
* **possible values**: `error`, `warn`, `off`

Preprocessors run first during `lint` and `bundle`.

:::info

For the `bundle` command, linting happens only when the `--lint` flag is used.

:::

## Rules

Use this object to change the [severity level](#severity-levels) of any rules in your configuration. Some rules may also receive [additional configurations](#additional-rule-options).

* **type**: `array of objects`
* **possible values**: `error`, `warn`, `off`

For `lint` command: rules run *after* preprocessors.
For `bundle` command: rules run *between* preprocessors and decorators.

### Examples

```yaml Short syntax
styleguide:
  rules:
    no-sibling-refs: error
```

```yaml Verbose syntax
styleguide:
  rules:
    no-sibling-refs:
      severity: error
```

```yaml Rules with additional configuration
# Use verbose configuration syntax to define additional configuration
# The boolean-parameter-prefixes example overrides the default "prefixes".
styleguide:
  rules:
    boolean-parameter-prefixes:
      severity: error
      prefixes: ['should', 'is', 'has']
```

## Decorators

Use this object to enable or disable decorators. They modify the definition in the bundling process after validation is complete. If you don't use decorators, omit this object.

* **type**: `array of objects`
* **possible values**: `error`, `warn`, `off`

For `bundle` command: decorators run *after* linting.

:::info

For the `bundle` command, linting happens only when the `--lint` flag is used.

:::

## Severity levels

* **applied to**: [`preprocessors`](#preprocessors), [`rules`](#rules), [`decorators`](#decorators)
* **possible values**: `error`, `warn`, `off`

### Examples

With the short configuration syntax, you can't configure [additional options](#additional-rule-options) for any given rule (if it supports them).

```yaml Short syntax
styleguide:
  extends:
    - recommended
  rules:
    boolean-parameter-prefixes: warn
    no-unused-components: error
```

```yaml Verbose syntax
styleguide:
  extends:
    - recommended
  rules:
    boolean-parameter-prefixes:
      severity: warn
    no-unused-components:
      severity: error
```

:::info

See the [rules documentation](../rules.md) for more information.

:::

## Additional rule options

The example below shows additional rule options for the `boolean-parameter-prefixes` rule:

```yaml
styleguide:
  extends:
    - recommended
  rules:
    boolean-parameter-prefixes:
      severity: warn
      prefixes: ["can", "has", "is", "should"]
    no-unused-components:
      severity: error
```

To know which rules support options, read the [rules documentation](../rules.md).

:::success Tip

If you write custom rules, you may create rules that accept additional configuration options as well.
Be sure to document those options for your users.

:::

## Different OpenAPI versions

Redocly CLI supports OpenAPI versions 2.0, 3.0, and 3.1. Most of the time, you will use one of them. However, you may need to configure different rules based on the version. You can do that by using special objects in your configuration.

```yaml
styleguide:
  extends:
    - recommended
  rules:
    boolean-parameter-prefixes: warn
    no-unused-components: error
  oas2Rules:
    no-unused-components: off
  oas3_0Rules:
    boolean-parameter-prefixes: error
```

In this example, the OpenAPI specification version is identified:

* If it is version 2 (formerly known as Swagger), it will prioritize the `oas2Rules` object.
* If it is version 3 (OpenAPI 3.x), it will prioritize the `oas3_0Rules` object.

:::info

If the version is not defined, it will fall back to the `rules` object.

:::

Read more about [rules](../rules.md).

## Resolve JSON references ($refs)

The OpenAPI specification supports `$refs` in some of the objects. In practice, different tools and implementations of the OAS, as well as API definition authors, may use or even require `$refs` in unsupported places.

Starting from version `beta-30` onward, Redocly CLI automatically resolves all `$refs` by default, even in places where they are not allowed by the specification. This includes primitive values, for example `string`, in description and examples fields.

To disable resolving `$refs` in examples, use the `doNotResolveExamples` option in the `lint` object of the Redocly configuration file. This does not affect `$ref` resolution in other parts of the API definition:

```yaml
styleguide:
  doNotResolveExamples: true
  extends:
    - recommended
  rules:
    (...)
```
