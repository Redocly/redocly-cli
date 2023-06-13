# Migrate to Redocly from Spectral

[Spectral](https://stoplight.io/open-source/spectral) offers similar linting capabilities to Redocly CLI and the rest of the Redocly tools. This guide lays out the differences so you can switch tools if you want to.

The first step is to [install Redocly CLI](../installation.md).

## Update command

Replace `spectral lint openapi.yaml` with the equivalent `redocly` command:

```yaml
redocly lint openapi.yaml
```

For more information, check out the [`lint` command documentation](../commands/lint.md).

### Specify ruleset

Instead of `--ruleset`/`-r`, use the `--extends` parameter to indicate which ruleset you are using as a basis.

Read more [about linting and rulesets](../api-standards.md)

### Choose output format

Similar to Spectral, Redocly offers multiple output formats using the `--format` parameter.

### Resolvers

If you use `--resolver` to handle how links and remote URLs are resolved, visit the [configuration documentation](../configuration.md/#resolve-object) to see how to handle this with Redocly.

## Update configuration

The configuration formats are a little different between the tools.

Redocly uses a configuration file called `redocly.yaml`, the main controls for linting are:

* Specify a [ruleset](../rules.md#rulesets).
* Add configuration for the [rules](../rules.md) accordingly. They can be set to error, warn, or off.
* Expand the collection with any [configurable rules](../rules/configurable-rules.md) that fit your standard.

### Example Redocly configuration file

Below is an example of a `redocly.yaml` configuration file, enabling the [minimal ruleset](../rules/minimal.md), disabling the `security-defined` rule, and setting up an example [configurable rule](../rules/configurable-rules.md) to check for the word "test" appearing in an operation summary.

```yaml
extends:
  - minimal

rules:
  security-defined: off
  rule/naming:
    subject:
      type: Operation
      property: summary
    assertions:
      pattern: /test/    
    message: "Operation must not include the word test"
```

It is also possible to configure additional rules for specific APIs using the [APIs object](../configuration.md#apis-object) to set per-API rules (or exceptions!).

