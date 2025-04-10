# Configure your linting rules

Use individual rules to make the API linting fit your API needs. Start with the [recommended](../rules/recommended.md) or [minimal](../rules/minimal.md) ruleset, then adjust as needed.

## Set rules and severity

Control the severity of each rule:

- `error`: return an error if this rule isn't satisfied
- `warn`: report a warning if this rule isn't satisfied
- `off`: disable this rule

Turn rules on to add them to the existing ruleset, or off if your API doesn't require them. Here's an example:

```yaml
extends:
  - recommended

rules:
  info-license: off
  path-kebab-case: error
```

The example removes one of the rules from the `recommended` ruleset, perhaps because this organization is still working on its standards, and adds another one, `path-kebab-case`, to ensure consistency of path design.

Find a full list of [built-in rules here](../rules/built-in-rules.md).

## Set rule options

Some rules allow additional configuration. For example, the rule `boolean-parameter-prefixes` supports an array of prefixes ([see rule documentation](../rules/oas/boolean-parameter-prefixes.md)). To set these in a configuration file, set the rule `severity` and any options within the rule configuration, like this:

```yaml
rules:
  boolean-parameter-prefixes:
    severity: error
    prefixes: ['can', 'is', 'has']
```

## Configurable rules

Configurable rules are your opportunity to customize the exact rules your API needs, by describing the conditions that the various API description fields should meet. Declare these alongside the built-in rules in your configuration file:

```yaml
rules:
  info-license: off
  rule/big-tag-name:
    subject:
      type: Tag
      property: name
    assertions:
      defined: true
      casing: MACRO_CASE
    severity: warn
    message: Tag names must be upper case with underscores (_).
```

Visit the [configurable rules page](../rules/configurable-rules.md) for more detailed documentation and many more examples.

## Rules from custom plugins

If you create your own rules in [custom plugins](../custom-plugins/custom-rules.md), you can add these in the rules section of `redocly.yaml`. Make sure to import the plugin first, and then refer to the rule name prefixed with the plugin name:

```yaml
plugins:
  - './my-best-plugin.js'

rules:
  my-best-plugin/rule1: error
```

It's recommended to use the built-in or configurable rules to meet your linting needs if possible, but the custom plugins can offer additional functionality or advanced logic if needed.
