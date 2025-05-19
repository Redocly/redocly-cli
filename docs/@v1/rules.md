---
seo:
  title: Rules
---

# Rules to describe API standards

Redocly uses rules to describe all the different aspects of API behavior that we check for during linting. Rules come in different levels of complexity, and can also be grouped for reuse. Here's an overview of what is available:

- **Rulesets** are groups of rules that can be applied to any API. This is a good way to build up a ruleset that you can use locally or with your CI. Multiple rulesets can be used at once, so feel free to make smaller ones and compose the rulesets that fit each API.
- **Built-in rules:** for the most common use cases, the rules are already made for you, all you need to do is choose if they should cause an `error`, simply `warn` of a problem, or be turned `off`. [See the built-in rules documentation](./rules/built-in-rules.md) for more information and examples.
- **Configurable rules** allow powerful describing of API standards without needing to write code. Create a configurable rule, choose which parts of the OpenAPI description it applies to, and what the criteria for success are. The linting tool does the rest. With plenty of examples, the [configurable rules](./rules/configurable-rules.md) helps you to describe your API standards easily and well.
- **Custom code rules** if none of the above exactly fits your needs, then a [custom code plugin](./custom-plugins/index.md) is an extensible way to bring some custom JavaScript to build on Redocly's existing features.

## Rulesets

Rulesets are groups of rules that are applied together, and APIs can be checked against as many rulesets as needed during linting. To get you started, there are some built-in rulesets:

- Our [recommended](./rules/recommended.md) ruleset is our unabashedly opinionated recommendation of what we think a good API looks like. It's a great place to start, before adapting to your own context.
- A [recommended-strict](./rules/recommended.md#recommended-strict-ruleset) ruleset is identical to the `recommended`, except it elevates all warnings to errors. It's the ideal option for those who don't want to miss anything.
- A [minimal](./rules/minimal.md) ruleset is a good starting point for an existing API that doesn't currently conform to any standard. It has fewer rules that cause an error, with others either downgraded to a warning or turned off completely.

Enable a ruleset by adding a block like this to the Redocly configuration file:

```yaml
extends:
  - recommended
```

You may then override the severity for any specific rule in the `rules` object.

### Severity settings

Severity settings determine how the rule is treated during the validation process.

- `severity: error` - if the rule is triggered, the output displays an error message and the API description doesn't pass validation.
- `severity: warn` - if the rule is triggered, the output displays a warning message. Your API description may still be valid if no other errors are detected.
- `severity: off` - turns off the rule. The rule is skipped during validation.

## Rule ideas

Redocly CLI supports [configurable rules](./rules/configurable-rules.md) and [custom plugins](./custom-plugins/index.md).
However, if you have an idea for a built-in rule you believe benefits the greater API community, please [open an issue](https://github.com/Redocly/redocly-cli/issues) in the Redocly CLI repository.
