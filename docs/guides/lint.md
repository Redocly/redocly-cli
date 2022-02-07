---
redirectFrom:
  - /docs/cli/configuration/lint/
---

# Introduction

The `lint` configuration section is part of the [Redocly configuration file](../configuration/configuration-file.mdx).
The `lint` and `bundle` commands use this section to control various options.

The `lint` configuration section consists of several sub-sections. The following code block shows an example `lint` section. Sub-sections are described further in the text.

```yaml
lint:
  plugins:
    - './local-plugin.js'
  extends:
    - recommended
  resolve:
    http:
      headers:
        - matches: https://api.example.com/v2/**
          name: X-API-KEY
          value: <direct value>
          envVariable: <name of env variable to be used as value>
        - matches: https://example.com/*/test.yaml
          name: Authorization
          value: <direct value>
          envVariable: <name of env variable to be used as value>
  rules:
    no-sibling-refs:
      severity: error
    boolean-parameter-prefixes:
      severity: error
      prefixes: ['should', 'is', 'has']
  ...
```

## Sub-sections

### Plugins

Use this section to import local plugins. If you don't have any custom plugins, omit this section.

* **type**: `array of strings`

:::warning

You don't need to import built-in plugins and rules.

Community plugins are not supported.

:::

#### Examples

```yaml Import a single plugin
lint:
  plugins:
    - './local-plugin.js'
```

```yaml Import multiple plugins
lint:
  plugins:
    - ['./local-plugin.js', './another-local-plugin.js']
```

### Extends

Use this section to choose the base configuration for further extension or adding your own plugins. You may override specific settings in the subsequent sections.

* **type**: `array of strings`
* **default**: `recommended`
* **possible values**: `minimal`, `recommended`, `all`

Possible values specified above are related to built-in rules only. Custom plugins can contain additional configurations, so it can be as follows:

```yaml
lint:
  extends:
    - recommended
    - my-custom-super-ruleset
```

Find more information in the [Configs in plugins](../resources/custom-rules.md#configs-in-plugins) section.


#### Examples

```yaml Single value
lint:
  extends:
    - minimal
```

```yaml Multiple values
lint:
  extends:
    - minimal
    - recommended
```

### Resolve

Use this section to specify external links in your definition that are not publicly accessible (except for Redocly API registry links).

* **type**: `object`

Redocly automatically resolves any API registry link or public URL. However, you may want to resolve links that are not API registry links or publicly accessible.

Currently, OpenAPI CLI only supports `http` headers. Only one `http` header per URL is supported in the `resolve` section:

```yaml
lint:
  resolve:
    http:
      headers:
        - # header configuration
```

#### Header configuration

| Property      | Description | Examples |
| ------------- | ----------- | -------- |
| `matches`     | Glob match against the URL. | `https://api.example.com/**` or `https://api.example.com/*.json` |
| `name`        | HTTP header name.           | `Authorization` or `X-API-KEY` |
| `value`       | The value of the header. Mutually exclusive with `envVariable`. | `123-abc` |
| `envVariable` | The name of the environment variable that contains the value of the header. Mutually exclusive with `value`. | `SECRET_KEY` |

:::success

It is recommended to use environment variables where possible.

:::

#### Example

```yaml
lint:
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

The first match takes precedence when a URL matches multiple patterns. Therefore, only the header from the first match will be used in the request.

### Preprocessors

As preprocessors are rarely indicated, you can omit this section in most cases.

* **type**: `array of objects`
* **possible values**: `error`, `warn`, `off`

Preprocessors run first during `lint` and `bundle`.

:::info

For the `bundle` command, linting happens only when the `--lint` flag is used.

:::

### Rules

Use this section to change the [severity level](#severity-levels) of any rules in your extended configurations. Some rules may also receive [additional configurations](#additional-rule-options).

* **type**: `array of objects`
* **possible values**: `error`, `warn`, `off`

For `lint` command: rules run *after* preprocessors.
For `bundle` command: rules run *between* preprocessors and decorators.

#### Examples

```yaml Short syntax
lint:
  rules:
    no-sibling-refs: error
```

```yaml Verbose syntax
lint:
  rules:
    no-sibling-refs:
      severity: error
```

```yaml Rules with additional configuration
# Use verbose configuration syntax to define additional configuration
# The boolean-parameter-prefixes example overrides the default "prefixes".
lint:
  rules:
    boolean-parameter-prefixes:
      severity: error
      prefixes: ['should', 'is', 'has']
```    

### Decorators

Use this section to enable or disable decorators. They modify the definition in the bundling process after validation is complete. If you don't use decorators, omit this section.

* **type**: `array of objects`
* **possible values**: `error`, `warn`, `off`

For `bundle` command: decorators run *after* linting.

:::info

For the `bundle` command, linting happens only when the `--lint` flag is used.

:::

### Severity levels

* **applied to**: [`preprocessors`](#preprocessors), [`rules`](#rules), [`decorators`](#decorators)
* **possible values**: `error`, `warn`, `off`

#### Examples

With the short configuration syntax, you can't configure [additional options](#additional-rule-options) for any given rule (if it supports them).

```yaml Short syntax
lint:
  extends:
    - recommended
  rules:
    boolean-parameter-prefixes: warn
    no-unused-components: error
```

```yaml Verbose syntax
lint:
  extends:
    - recommended
  rules:
    boolean-parameter-prefixes:
      severity: warn
    no-unused-components:
      severity: error
```

:::info

See the [rules documentation](../resources/built-in-rules.md) for more information.

:::

### Additional rule options

The example below shows additional rule options for the `boolean-parameter-prefixes` rule:

```yaml
lint:
  extends:
    - recommended
  rules:
    boolean-parameter-prefixes:
      severity: warn
      prefixes: ["can", "has", "is", "should"]
    no-unused-components:
      severity: error
```

To know which rules support options, read the [built-in rules documentation](../resources/built-in-rules.md).

:::success Tip

If you write custom rules, you may create rules that accept additional configuration options as well.
Be sure to document those options for your users.

:::

### Different OpenAPI versions

Redocly OpenAPI CLI supports OpenAPI versions 2.0, 3.0, and 3.1. Most of the time you will use one of them. However, you may need to configure different rules based on the version. You can do that by using additional configuration sections:

```yaml
lint:
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

* If it is version 2 (formerly known as Swagger), it will prioritize the `oas2Rules` section.
* If it is version 3 (OpenAPI 3.x), it will prioritize the `oas3_0Rules` section.

:::info

If the version is not defined, it will fall back to the `rules` section.

:::

Read more about [built-in rules](../resources/built-in-rules.md).

### Resolving JSON references ($refs)

The OpenAPI specification supports `$refs` in some of the objects. In practice, different tools and implementations of the OAS, as well as API definition authors, may use or even require `$refs` in unsupported places.

Starting from version `beta-30` onward, OpenAPI CLI automatically resolves all `$refs` by default, even in places where they are not allowed by the specification. This includes primitive values, for example `string`, in description and examples fields.

To disable resolving `$refs` in examples, use the `doNotResolveExamples` configuration option in the `lint` section of `.redocly.yaml`. This does not affect `$ref` resolution in other parts of the API definition:

```yaml
lint:
  doNotResolveExamples: true
  extends:
    - recommended
  rules:
    (...)
```
