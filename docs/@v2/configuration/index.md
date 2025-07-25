---
seo:
  title: Redocly CLI configuration
  description: Learn how to configure Redocly CLI
toc:
  maxDepth: 3
---

# Redocly configuration file

You can configure all of your Redocly tools using a single `redocly.yaml` configuration file in the root of your project. Your `redocly.yaml` configurations can be used locally, in CI, or on our hosted platforms to specify the following behaviors:

- The rules to apply to your APIs and how strictly to `lint`.
- The styles and features to use when rendering your API documentation.
- Project-aware configuration for the VSCode extension.

Redocly CLI searches for the file in the local directory, or you can specify a configuration file with your command.

Our starter projects like `openapi-starter` include the file for you to edit.

## Example Redocly configuration file

An example is worth a thousand words, or so they say. Here's a simple configuration file showing some of the options available and how to use them.

```yaml
extends:
  - recommended

apis:
  core@v2:
    root: ./openapi/openapi.yaml
    rules:
      no-ambiguous-paths: error
  external@v1:
    root: ./openapi/external.yaml
    openapi:
      hideLogo: true

openapi:
  schemaExpansionLevel: 2
  generateCodeSamples:
    languages:
      - lang: curl
      - lang: Python
```

Read on to learn more about the various configuration sections and what you can do with each one.

## Using configuration with Redocly CLI

Some of the Redocly CLI commands, such as the [lint command](../commands/lint.md), use the API names from the `apis` object as shortcuts for referencing API descriptions.
You can tell the `lint` command to validate specific API descriptions by using their names from the `apis` object, like in the following example:

```shell
redocly lint core@v2
```

On the other hand, if you run the command without specifying any aliases, it applies to all API descriptions listed in the `apis` object of the configuration file.

```shell
redocly lint
```

This runs the `lint` command for every API defined in the configuration file.

## Configuration file overview

Learn about the various sections of the config file, and follow the links for detailed documentation for each.

<a id="extends-list"></a>

### Expand existing configuration with `extends`

Use `extends` to adopt an existing [ruleset](../rules.md#rulesets) such as the `recommended` or `minimal` standards.
You can also define your own rulesets and refer to them here by file path or URL.

While the order of the sections in the configuration file doesn't matter, usually `extends` is first, and any later rules, preprocessors or decorators defined in this file then override the base settings.

Read the [detailed `extends` documentation](./extends.md) to see more information and examples.

### Configure linting `rules`

In the `rules` section, configure which rules apply, their severity levels, and any options that they support.
Configurable rules, and rules from custom plugins are also configured here.

Use this section to adjust the linting rules from the rulesets or other base configuration set in `extends`, and fine-tune it to meet the needs of your API. Here's an example `redocly.yaml`, changing some rule severity, and using some additional configuration for a rule.

```yaml
rules:
  no-unused-components: error
  operation-singular-tag: warn
  boolean-parameter-prefixes:
    severity: error
    prefixes: ['can', 'is', 'has']
```

You can also define your [configurable rules](../rules/configurable-rules.md) here.

For more information and examples, visit the [configuring rules documentation](./rules.md).

<a id="theme-object"></a>

### Configure OpenAPI features and documentation styles

#### mockServer object

You can apply `mockServer` to individual APIs as well as at the root (default) level.
In case of conflict, API takes priority.

The API registry supports [the mock server feature](https://redocly.com/docs/api-registry/guides/mock-server-quickstart/) and allows project owners to enable it for all branches per API version.
When the mock server is enabled for an API, you can send test requests to it from any API client.

The `mockServer` object allows additional configuration of the mock server behavior.
This object is optional.

#### Fixed properties

{% json-schema
  schema={
    "$ref": "./mockserver.yaml"
  }
/%}

#### openapi object

The `openapi` object configures features and theming for API documentation generated from OpenAPI descriptions.

If you need to apply different theming and functionality to individual APIs, add the `openapi` property to the appropriate API in the `apis` object, and use the same options as the global `openapi` object.

Find the full list of supported options on the [Reference docs configuration page](https://redocly.com/docs/api-reference-docs/configuration/functionality/).

<a id="apis-object"></a>

### Configure each of the `apis` independently

For organizations with multiple APIs, versions or environments, having specific configuration for each is a powerful tool.
All configuration options can be nested within a specific API entry.

#### Example of `apis` configuration

```yaml
extends:
  - recommended

apis:
  public@v2:
    root: ./openapi/openapi.yaml
    rules:
      operation-4xx-response: off
  internal@v1:
    root: ./internal-openapi/openapi.yaml
    rules:
      security-defined: off
      operation-4xx-response: off
    decorators:
      remove-x-internal: on
```

Visit the [per-API configuration page](./apis.md) for detailed documentation and more examples.

<a id="plugins-list"></a>

### Use custom `plugins`

Use this list to import any custom plugins (omit this section if you have no plugins). Custom plugins are used to add any custom decorators or rules that you want to use, that aren't provided by the Redocly [built-in rules](../rules/built-in-rules.md), [configurable rules](../rules/configurable-rules.md), or existing [decorators](../decorators.md).

Add each plugin by path, relative to the configuration file, to have the plugin contents available to configure.
Importing by URL isn't supported, to reduce the risk of malicious code execution.

Find more information on the [configuration in plugins](../custom-plugins/custom-config.md) page.

#### Plugin import example

Use the `plugins` section to import as many plugins as you need to refer to in your config file.

```yaml
plugins:
  - './local-plugin.js'
  - './another-local-plugin.js'
```

The rules, decorators, pre-processors and configuration contained in the plugins become available to your configuration file.

<a id="resolve-object"></a>

### Resolve non-public or non-remote URLs

Redocly automatically resolves any API registry link or public URL in your API descriptions.
If you want to resolve links that are neither API registry links nor publicly accessible, set the `resolve` object in your configuration file.

Redocly CLI supports one `http` header per URL.

#### Fixed properties

{% json-schema
  schema={
    "$ref": "./resolve.yaml"
  }
/%}

#### Example

Here is an example for adding header definitions:

```text
resolve:
  http:
    headers:
      - matches: https://api.example.com/v2/**
        name: X-API-KEY
        envVariable: SECRET_KEY
      - matches: https://example.com/*/test.yaml
        name: Authorization
        envVariable: SECRET_AUTH
```

The first match takes priority when a URL matches multiple patterns.
Therefore, only the header from the first match is used in the request.

### Split up the configuration file

As your config file grows, you may want to split it into multiple parts.
Splitting a config file is possible by using references in a config similar to how they are used in OpenAPI descriptions:

```yaml
extends:
  - recommended
openapi:
  $ref: ./openapi-theme.yaml
mockServer:
  $ref: ./mockserver.yaml
```

{% admonition type="info" %}
When using the `push` command with a config file that includes `$ref`s, all referenced files are explicitly uploaded using the `--files` option.
{% /admonition %}
