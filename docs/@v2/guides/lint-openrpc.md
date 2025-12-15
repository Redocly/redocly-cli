---
seo:
  title: Lint Open-RPC with Redocly CLI
  description: Use the Redocly CLI to enforce basic validation, configure rules, or even build custom plugins for Open-RPC.
---

# Lint Open-RPC with Redocly CLI

{% admonition type="info" name="Experimental Open-RPC support" %}
This feature is at an early stage, please use with caution and send us lots of feedback!
{% /admonition %}

In addition to providing lint functionality for multiple OpenAPI formats, Redocly CLI also has support for Open-RPC.
Redocly CLI supports the following linting approaches with Open-RPC documents:

- Open-RPC document validation.
- Supported versions:
  - [Open-RPC 1.x](https://spec.open-rpc.org/)
- Built-in rules for checking common standards requirements (see the [list of Open-RPC rules](#open-rpc-rules)).
- [Configurable rules](../rules/configurable-rules.md) so that you can build your own rules following common patterns
- [Custom plugins](../custom-plugins/index.md) for advanced users that need additional functionality

## Lint an existing Open-RPC file

Redocly CLI takes its settings from a `redocly.yaml` configuration file.
Below is an example of a simple configuration file for validating an Open-RPC file is in the expected format:

```yaml
rules:
  struct: error
```

The empty `extends` element instructs Redocly CLI not to use any existing rulesets, but to display an error if the `struct` rule finds any problem.
This rule checks that the document structure matches the Open-RPC specification.

With this configuration file, and your Open-RPC description file, run the linting command:

```sh
redocly lint open-rpc.json
```

The output describes any structural problems with the document, or reports that it is valid.

## Open-RPC rules

To expand the linting checks for an Open-RPC description, start by enabling some of the built-in rules.
The currently supported rules are:

- `no-unresolved-refs`: Every `$ref` must exist.
- `no-unused-components`: All components must be used.
- `spec-no-duplicated-method-params`: The list of parameters must not include duplicated parameters.
- `spec-no-required-params-after-optional`: Required parameters must be positioned before optional parameters.
- `info-contact`: Contact section is defined under `info`.
- `info-license`: License section is defined under `info`.

We expect the list to expand over time, so keep checking back - and let us know if you have any requests by [opening an issue on the GitHub repo](https://github.com/Redocly/redocly-cli/issues).

To use a rule in your own linting setup, add the rule name to the `rules` configuration section, and declare the severity level (either `error`, `warn` or `off`).
Here's an example of a rules block where a missing contact section causes a warning, and a tag without a description triggers an error:

```yaml
rules:
  info-contact: warn
  info-license: error
```

Pick and mix the available rules until you have the setup that fits your situation.

## Configurable rule example

Redocly CLI also offers [configurable rules](../rules/configurable-rules.md) that allow you to set assertions about the API description being linted. This functionality works for Open-RPC too.
The following example shows a configurable rule that displays a warning if the `title` field is not present in the `info` block:

```yaml
rules:
  rule/info-title:
    subject:
      type: Info
      property: title
    assertions:
      defined: true
    severity: warn
```

With the extensive configurable rules options available, there are many opportunities to make sure that your Open-RPC spec conforms with expectations. We'd also love to see what you're building - it helps us know how things are going!

{% admonition type="info" name="Custom plugins" %}
To create your own plugins, see the [custom plugins documentation](../custom-plugins/index.md).

{% /admonition %}
