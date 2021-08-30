---
redirectFrom:
  - /docs/cli/configuration/lint/
---
# Lint configuration

The `lint` configuration section is part of the [Redocly configuration file](../configuration/configuration-file.mdx).
It is used by the `lint` and `bundle` commands to control various options.

Modify (or create) the `.redocly.yaml` file in the directory from which you are going to run the `lint` or `bundle` commands.

:::attention

When using our hosted Workflows product, the `.redocly.yaml` file must be in the root of the repository.

:::

Read about the [`--config` option](../commands/index.md) to use other file names or locations.

From a high-level, there are a few sub-sections.
```yaml
lint:
  plugins:
    # This section is where you can import local plugins.
    # We don't support community plugins.
    # You don't need to import our built-in plugins and rules.
    # Omit this section if you don't have custom plugins.
    - './local-plugin.js'

  extends:
    # This section is where you choose the base configurations.
    # You may override specific settings in the subsequent sections.
    - recommended # This is the default (and built in) configuration. If it is too strict, try `minimal`.

  resolve:
    # Use this when you have external links in your definition that are not publicly accessible.
    # Not required for Redocly API registry links.
    # We recommend using environment variables for when possible.
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

  preprocessors:
    # Preprocessors are rarely indicated -- avoid if possible.
    # This section can be omitted.

  rules:
    # Override any rules that are available from the extends configuration.
    # Severity options are "error", "warn" or "off".
    no-sibling-refs: error # Uses syntactic sugar to define the severity level of an option.
    # Alternative verbose configuration
    no-sibling-refs:
      severity: error
    # Some rules may have additional configuration options. Use the verbose configuration style in those cases.
    # This boolean parameter prefixes example overrides the default "prefixes".
    boolean-parameter-prefixes:
      severity: error
      prefixes: ['should', 'is', 'has']

  decorators:
    # Decorators modify the the definition after validation is complete, only in the bundling process.
    # This section can be omitted if you don't use decorators.
  ...
```


## Severity levels

This applies to the preprocessors, rules, and decorators subsections of the lint configuration.

This file excerpt shows utilizing syntactic sugar to control the problem severity.

The severity level options are:
- off
- warn
- error

**Example**

```yaml
lint:
  extends:
    - recommended
  rules:
    boolean-parameter-prefixes: warn
    no-unused-components: error
```

When using the short syntax, you're unable to configure additional options for any given rule.
Not all rules have additional options.
See the rules documentation for more information.
This is exactly the same as the settings above.

```yaml
lint:
  extends:
    - recommended
  rules:
    boolean-parameter-prefixes:
      severity: warn
    no-unused-components:
      severity: error
```

## Additional rule options

In this example, we define additional rule options for the `boolean-parameter-prefixes` rule.
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
To know which rules support options, please read the built-in rules documentation.

:::success Tip

If you write custom rules, you may create rules that accept additional configuration options as well.
Be sure to document those options for your users.

:::

## Different OpenAPI versions

Redocly OpenAPI CLI supports versions 2 and 3 of OpenAPI.
However, you may need to configure different rules based on the version.
You can do that by using additional configuration sections.

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

In this example, the OpenAPI specification version is identified.

If it is version 2 (formerly known as Swagger), it will prioritize the `oas2Rules` section.
If not defined, it will fall back to the `rules` section.

If it is version OpenAPI 3.0, it will prioritize the `oas3_0Rules` section.
If not defined, it will fall back to the `rules` section.

Read about our [built-in rules](../resources/built-in-rules.md).


## Resolving JSON references ($refs)

The OpenAPI specification supports $refs in some of the objects. In practice, different tools and implementations of the OAS, as well as API definition authors, may use or even require $refs in unsupported places.

Starting with version `beta-30`, OpenAPI CLI automatically resolves all $refs by default, even in places where they are not allowed by the specification. This includes primitive values like `string` (e.g. in `description` fields) and examples.

To disable resolving $refs in examples, use the `doNotResolveExamples` configuration option in the `lint` section of `.redocly.yaml`. This does not affect $ref resolution in other parts of the API definition.

**Example**

```yaml
lint:
  doNotResolveExamples: true
  extends:
    - recommended
  rules:
    (...)
```


## Resolving external links

Redocly will automatically resolve any API registry link or public URL.
However, you may want to resolve links that are not API registry links or publicly accessible.

Define a `resolve` section to accomplish that.

Currently, OpenAPI CLI only supports `http` headers. Only one `http` header per URL is supported in the `resolve` section.

It should be structured like this:

```yaml
lint:
  resolve:
    http:
      headers:
        - # header configuration
```

Then, add your header definitions.

| Property | Description | Examples |
| --- | --- | --- |
| matches | Glob match against the URL. | `https://api.example.com/**` or `https://api.example.com/*.json`|
| name | HTTP header name. | `Authorization` or `X-API-KEY`|
| value | The value of the header. Mutually exclusive with `envVariable`. | `123-abc`|
| envVariable | The name of the environment variable that contains the value of the header. Mutually exclusive with `value`. |`SECRET_KEY`|

Here is a structured example:

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

The first match will win in the event that a URL matches multiple patterns.
Therefore, only the header from the first match will be used in the request.

