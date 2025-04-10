---
seo:
  title: API standards
---

# API standards and governance

In APIs, making sure that an API meets certain standard behaviors, and continues to meet them even as it evolves, is really important. Most API providers use tooling to ensure that their APIs have all the features they expect of them - and that their users expect too.

This can be simple API consistency, such as whether resource names should use `kebab-case` or `camelCase` in URLs, or whether any error described contains the expected fields. It can be user-centric, making sure that the documentation is thorough and includes descriptions for all endpoints, or example values for all parameters. For some organizations, security is vital and API governance and linting tools can check that every endpoint has security rules designed for it.

## Ensure compliance with API linting

Redocly offers linting to make sure that an OpenAPI description matches the expected standards. It's available in the Redocly CLI tool and in our hosted platform. Both tools share a common configuration so you can use the same setup for both environments.

Choose between one of the existing rulesets, or compile your own. There are some built-in rules for common use cases, and configurable rules for when you need to express something specific to your use case. For advanced users, you can also create your own rules by building custom plugins with Javascript.

Once the ruleset is created, use it with your API and Redocly in any or all of these ways:

- every update to an API in the API registry is linted with the rules for that API
- use Redocly CLI to lint APIs as part of your continuous integration setup, such as in GitHub Actions
- during development, check the API you are working on using Redocly CLI on your local machine

By establishing good standards and making them part of your development workflow, keeping the APIs as you would like them becomes painless good practice, even when there are many changes being worked on.

### Get started with API standards

- [Redocly linting rules](./rules.md)
- [Configure a simple API standard ruleset](./guides/configure-rules.md)
- [See the list of built-in rules](./rules/built-in-rules.md)

## Enhance an existing OpenAPI description

Sometimes, the OpenAPI description you have isn't the one you wish you had. Redocly's [decorators](./decorators.md) feature enables you to make repeatable changes to an API description, so that you can reapply the changes instantly when the API changes. This is a very good way to improve the developer experience for your API users.

Whether you need to filter out some endpoints before publishing documentation, improve or add description fields, or add other elements to bring your API description to the standard you'd like, decorators can help.

- [Redocly decorators](./decorators.md)
- [Custom plugins in Javascript](./custom-plugins/index.md) allow you to create your own advanced decorators.
