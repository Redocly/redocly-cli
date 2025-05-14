---
seo:
  title: Lint AsyncAPI with Redocly CLI
  description: Unlock powerful linting capabilities for AsyncAPI documents. Use the Redocly CLI to enforce basic validation, configure rules, or even build custom plugins for AsyncAPI.
---

# Lint AsyncAPI with Redocly CLI

{% admonition type="info" name="Experimental AsyncAPI support" %}
This feature is at an early stage, please use with caution and send us lots of feedback!
{% /admonition %}

In addition to providing lint functionality for multiple OpenAPI formats, Redocly CLI also has support for AsyncAPI.
Redocly CLI supports the following linting approaches with AsyncAPI documents:

- AsyncAPI document validation, including full binding validation for [supported protocols](#supported-protocols).
- Supported versions:
  - [AsyncAPI 3.0](https://www.asyncapi.com/docs/reference/specification/v3.0.0)
  - [AsyncAPI 2.6](https://v2.asyncapi.com/docs/reference/specification/v2.6.0)
  - earlier versions in the 2.x family may also validate successfully
- Built-in rules for checking common standards requirements (see the [list of AsyncAPI rules](#asyncapi-rules)).
- [Configurable rules](../rules/configurable-rules.md) so that you can build your own rules following common patterns
- [Custom plugins](../custom-plugins/index.md) for advanced users that need additional functionality

## Lint an existing AsyncAPI file

Redocly CLI takes its settings from a `redocly.yaml` configuration file.
Below is an example of a simple configuration file for validating an AsyncAPI file is in the expected format:

```yaml
rules:
  struct: error
```

The empty `extends` element instructs Redocly CLI not to use any existing rulesets, but to display an error if the `struct` rule finds any problem.
This rule checks that the document structure matches the AsyncAPI specification.

With this configuration file, and your AsyncAPI description file (or use one of the [existing examples](https://github.com/asyncapi/spec/tree/master/examples)), run the linting command:

```sh
redocly lint asyncapi.yaml
```

The output describes any structural problems with the document, or reports that it is valid.

## AsyncAPI rules

To expand the linting checks for an AsyncAPI description, start by enabling some of the built-in rules.
The currently supported rules are:

- `info-contact`: the `Info` section must contain a valid `Contact` field.
- `operation-operationId`: every operation must have a valid `operationId`.
- `channels-kebab-case`: channel address should be `kebab-case` (lowercase with hyphens).
- `no-channel-trailing-slash`: channel names must not have trailing slashes in their address.
- `tag-description`: all tags require a description.
- `tags-alphabetical`: tags should be listed in the AsyncAPI file in alphabetical order.

We expect the list to expand over time, so keep checking back - and let us know if you have any requests by [opening an issue on the GitHub repo](https://github.com/Redocly/redocly-cli/issues).

To use a rule in your own linting setup, add the rule name to the `rules` configuration section, and declare the severity level (either `error`, `warn` or `off`).
Here's an example of a rules block where a missing contact section causes a warning, and a tag without a description triggers an error:

```yaml
rules:
  info-contact: warn
  tag-description: error
```

Pick and mix the available rules until you have the setup that fits your situation.

## Configurable rule example

Redocly CLI also offers [configurable rules](../rules/configurable-rules.md) that allow you to set assertions about the API description being linted. This functionality works for both AsyncAPI and OpenAPI.
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

With the extensive configurable rules options available, there are many opportunities to make sure that your AsyncAPI spec conforms with expectations. We'd also love to see what you're building - it helps us know how things are going!

{% admonition type="info" name="Custom plugins" %}
To create your own plugins, see the [custom plugins documentation](../custom-plugins/index.md).

{% /admonition %}

## Supported protocols

AsyncAPI supports an ever-expanding list of protocols, here's the list of what's currently supported:

- `http`
- `ws`
- `kafka`
- `anypointmq`
- `amqp`
- `amqp1`
- `mqtt`
- `mqtt5`
- `nats`
- `jms`
- `sns`
- `solace`
- `sqs`
- `stomp`
- `redis`
- `mercure`

If you're using other protocols, you can still use Redocly CLI to lint an AsyncAPI description, but the details of those protocol bindings aren't validated and no problems are reported in those areas.
The bindings listed above should all work as expected, however please [open an issue](https://github.com/Redocly/redocly-cli/issues) if you see something that doesn't look right.
It's an extensive standard and we don't use all these technologies ourselves, so your input is genuinely welcome.
