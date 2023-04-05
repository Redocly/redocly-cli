# API governance and linting

In APIs, making sure that an API meets certain standard behaviours, and continues to meet them even as it evolves, is really important. Most API providers use tooling to ensure that their APIs have all the features they expect of them - and that their users expect too.

This can be simple API consistency, such as whether resource names should use `kebab-case` or `CamelCase` in URLs, or whether any error described contains the expected fields.

It can be user-centric, making sure that the documentation is thorough and includes descriptions for all endpoints, or example values for all parameters.

For some organisations, security is vital and API governance and linting tools can check that every endpoint has security rules designed for it.

## Using Redocly for API standards

Redocly offers linting to make sure that an OpenAPI description matches the expected ruleset. It's available in the Redocly CLI tool and in our hosted platform. Both tools share a common configuration so you can use the same setup for both environments.

To get started:

- [Configure a simple API standard ruleset](./guides/configure-rules.md)
- [See the full list of rules available](./rules.md)
