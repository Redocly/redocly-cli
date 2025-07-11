# Configure API linting

Every API has a different purpose and therefore different standards apply.
If you work in high security financial data, you may want a higher level of compliance with API standards than if you are creating a quick backend for a web application.
Configuring an appropriate combination of rules is important. If the standards are too strict, you risk ignoring errors and missing something important, but if they are too lax then your OpenAPI description may be inconsistent or incomplete for your needs.

In this guide, learn how to choose and adapt the rules built into Redocly for your own needs.

## Pick an existing ruleset

To get started, try one of the existing rulesets and see if it meets your needs.

- The [`spec`](../rules/spec-ruleset.md) ruleset follows the OpenAPI specification.
- The [`recommended`](../rules/recommended.md) ruleset has a good basic set of rules for a consistent, user-friendly API.
- The [recommended-strict](../rules/recommended.md#recommended-strict-ruleset) ruleset is identical to the `recommended`, except it elevates all warnings to errors so that you don't miss the warnings, i.e. in a CI pipeline.
- Or try the [`minimal`](../rules/minimal.md) ruleset which shows some warnings, but far fewer errors that would cause the lint to fail.

You can specify the ruleset with the `lint` command in Redocly CLI like this:

```bash
redocly lint --extends recommended openapi.yaml
```

However, for anything more complicated, or to use the functionality with the API registry, the best way to configure the linting rules is in the configuration file.

## Create reusable configuration

Redocly expects configuration files to be named `redocly.yaml`; you can also choose another name and supply it to Redocly CLI using the `--config` parameter.

The most simple configuration file looks like this:

```yaml
extends:
  - recommended
```

The configuration here is _very_ minimal with only the ruleset defined so far.
Your config file also holds settings for themes, much more detailed configuration for linting and decorating, and custom plugins.

{% admonition type="info" %}
You can also define rulesets and other linting details differently for each API if you need to.
{% /admonition %}

## Adjust the rules in use

The recommended ruleset aims to be best practice for all use cases, but every situation is different and some of the defaults may not fit your needs.
You can tweak existing rulesets by turning rules on or off, or setting them to be warnings or errors.

As an example, here's a configuration file for a public API, where the rule `security-defined` shouldn't cause an error:

```yaml
extends:
  - recommended

rules:
  security-defined: off
```

Customizing the rulesets is a great way to get API linting set up in a way that meets your needs - not causing so many errors that you end up turning it off, but also catching any regression in standards as the API grows and evolves.

## Create a reusable ruleset

If you work with multiple APIs, or need to use consistent API linting in different projects, consider creating a ruleset that you can use in each situation.

Reusable rulesets are configured the same way as the Redocly CLI, but the yaml file contains only the `rules:` section.
Below you can see an example ruleset from a `reusable-ruleset.yaml` file:

```yaml
rules:
  operation-singular-tag: error
```

The custom ruleset sets the rule `operation-singular-tag` to error if it isn't satisfied, so every operation must have exactly one tag otherwise an `error` is reported.

To use the ruleset in a Redocly CLI configuration file, add it to the `extends` array, something like this:

```yaml
extends:
  - recommended
  - ./custom-ruleset.yaml

rules:
  security-defined: off
```

Since multiple rulesets can be added, and you can adjust these settings for each API, this gives a flexible approach to build up different levels of compliance and check your APIs against the appropriate level for each.

## Use configurable rules

Assertions are a low-code way of creating targeted rules for specific situations in your use case.
Specify elements of the API description that you want to be checked, and using features like `defined`, `nonEmpty`, and `pattern`, describe the expectations for that element.

Add your desired assertions to the `rules:` configuration in the Redocly configuration file.
The example below creates a `version-semver` assertion, ensuring that theAPI version is in [Semantic Version](https://semver.org/) format with the major version set to 1:

```yaml
extends:
  - recommended

rules:
  security-defined: off
  rule/version-semver:
    subject:
      type: Info
      property: version
    assertions:
      pattern: /1\.[0-9]\.[0-9]/
    message: API version must be in SemVer format, no major version release
```

The `subject` is the `version` property of the `info` object; Info is a [recognized node type](https://redocly.com/docs/openapi-visual-reference/openapi-node-types/).
Using the `pattern` assertion, describe what's allowed with [regular expression syntax](https://en.wikipedia.org/wiki/Regular_expression).
Finally, adding the `message` ensures clear information is conveyed if the rule isn't satisfied.

Using the supplied assertion features, you can extend the built-in rules in Redocly and describe the success criteria for APIs in your organization.

## Set up per-API configuration

Not all APIs are made equal.
Perhaps your newsletter signup microservice is held to a different standard than the finance-related APIs in use in your organization.
Perhaps one API can't be changed, but newer versions can be checked against stricter rules.
Whatever the reason, per-API configuration can be useful in these situations.

You can configure linting differently for multiple APIs in a Redocly configuration file.
Here's an example with three APIs defined, and different rules applied for each:

{% code-snippet
  file="../../_code-snippets/per-api-rules-example.yaml"
  language="yaml"
  title="redocly.yaml"
/%}

There's a few things going on in the example, but let's look at each feature in turn:

- The first section configures `recommended` as the default ruleset for all APIs. The "newsletter" API overrides this by declaring `minimal` for itself, but the others inherit the top-level setting.
- No rules are defined at the top level, but since every API sets the `no-server-trailing-slash` rule to "off", this could be set at the top level.
- Each API adds (or removes) the rules that fit their use case, including using the `version-semver` assertion.

Configuring per API means that you don't have to compromise for the lowest standard that all APIs can meet.
Especially when you are working on improving your APIs or API descriptions, setting the desired ruleset and adding exceptions until the API meets all requirements in full is a good way to ensure improvement of standards.

## Next steps

- Check out the detailed reference documentation for the [built-in rules](../rules/built-in-rules.md) and [configurable rules](../rules/configurable-rules.md).
- If nothing there meets your needs, you can create your own rules by creating [custom plugins](../custom-plugins/index.md) with JavaScript.
