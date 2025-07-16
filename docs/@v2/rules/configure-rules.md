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
  path-segment-plural:
    severity: error
    ignoreLastPathSegment: true
    exceptions:
      - people
```

Check the documentation for each rule to see if it supports additional configuration.

## Per-API configuration

You can set different rules for individual APIs by adding a `rules` object under each API in `apis`.

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

## Per-API configuration with configurable rules

You can use configurable rules for individual APIs.
In the following example, `UserApi@1` has a configurable rule defined.
This rule applies only to `UserApi@1`.

{% code-snippet
  file="../../_code-snippets/per-api-rules-example.yaml"
  language="yaml"
  title="redocly.yaml"
/%}

## Resources

- Learn more about [rules and rulesets](../rules.md).
- Check the list of [built-in rules](./built-in-rules.md).
