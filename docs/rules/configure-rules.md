# Configure linting rules

Configure the rules for API linting in the `redocly.yaml` configuration file.

You can add rules, change their severity, or turn them off completely.
Some rules support additional configuration.

You can also provide per-format or even per-API rule configuration.
Use these approaches when your different types of API, or individual APIs, have different linting requirements.

## Simple rule configuration

The following example shows rules configured in `redocly.yaml` with short syntax using the format `rule-name: {severity}`, where `{severity}` is one of `error`, `warn` or `off`:

```yaml
rules:
  operation-operationId: warn
  
```

Some rules support additional configuration options. The following example shows the more verbose format where the `severity` setting is added alongside other settings:

```yaml
rules:
  path-excludes-patterns: 
    severity: error
    patterns:
      - ^\/fetch
      - ^\/v[0-9]
```

Check the documentation for each rule to see if it supports additional configuration.

## Per-format configuration

To configure rules that are different for different API formats or versions of API formats, you can use the format/version-specific configuration keys as shown in the table below:

| Configuration | Use for |
|-------|-------|
| `oas2Rules` | OpenAPI 2.x |
| `oas3_0Rules` | OpenAPI 3.0 |
| `oas3_1Rules` | OpenAPI 3.1 |
| `async2Rules` | AsyncAPI 2.6 |
| `async3Rules` | AsyncAPI 3.0 |
| `arazzoRules` | Arazzo 1.0 |

Using this approach is useful where you have different requirements for the different types of API description, but not necessarily every API. For example, you might choose to enable a very minimal set of rules for all formats, and add some additional restrictions for the OpenAPI 3.1 descriptions since those are expected to meet a higher standard.

The following configuration file shows an example of a minimal ruleset configuration, with some rules adjusted (both increased in severity and disabled) for different OpenAPI description formats:

```yaml
extends:
 - minimal

rules:
  info-description: warn

oas2Rules:
  no-unresolved-refs: off

oas3_1Rules:
  info-license: error
  no-ambiguous-paths: error
  operation-operationId-unique: error
```

Use these settings alongside `rules` configuration to tune the linting for each API description format.

## Per-API configuration

You can set different rules for different APIs by adding a `rules` object under each API in `apis`.

```yaml
rules:
  operation-operationId: error

apis:
  museum:
    root: ./apis/museum.yaml
    rules:
      info-license: warn
  tickets@beta:
    root: ./apis/tickets.yaml
    rules:
      info-license: error
      operation-operationId-url-safe: error
      operation-operationId-unique: error

```

Each API picks up the settings that relate to it and gets linted accordingly.

## Resources

- Learn more about [rules and rulesets](../rules.md).
- Check the list of [built-in rules](./built-in-rules.md).
