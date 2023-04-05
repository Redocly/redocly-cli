# Configure API linting

Every API has a different purpose and therefore different standards will apply. If you work in high security financial data, you will want a higher level of compliance with API standards than if you are creating a quick backend for a web application. Configuring an appropriate combination of rules is important; if the standards are too harsh, you risk ignoring errors and missing something important, but if they are too lax then your OpenAPI description may be inconsistent or incomplete for your needs.

In this guide, you will learn how to chose and adapt the rules built into Redocly for your own needs.

## Pick an existing ruleset

To get started, try one of the existing rulesets and see if it meets your needs. 

* The [`recommended`](../rules/recommended) ruleset has a good basic set of rules for a consistent, user-friendly API.
* Or try the [`minimal`](../rules/minimal) ruleset which will show some warnings, but far fewer errors that would cause the lint to fail.

You can specify the ruleset with the `lint` command in Redocly CLI like this:

```bash
redocly lint --extends recommended openapi.yaml
```

However for anything more complicated, or to use the functionality with the API registry, the best way to configure the linting rules is in the configuration file.

