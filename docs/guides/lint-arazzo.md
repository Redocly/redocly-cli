# Lint Arazzo with Redocly CLI

Arazzo is a open standard for describing multi-step API calls in sequence.
While under development, this standard was also known as "OpenAPI Workflows".
Redocly CLI offers support for checking that your Arazzo files are valid.

{% admonition type="info" name="Experimental Arazzo support" %}
This feature is at an early stage, please send us lots of feedback!
{% /admonition %}

## Lint an Arazzo file

Use your existing Arazzo files, or use the examples in the [Museum API project](https://github.com/Redocly/museum-openapi-example) if you'd prefer to use sample data to try things out.

**Pro-tip:** linting is much more interesting if the file actually does contain problems.
Be your own chaos monkey and introduce some errors before you proceed!

Lint using a command like the following:

```bash
redocly lint arazzo/museum-api.arazzo.yaml
```

If the file does not match the specification, the tool shows the details of each error that it finds.

{% admonition type="info" name="Validation only" %}
No additional rules or configuration are available for Arazzo in the current version of Redocly CLI; the tool merely checks that the file meets the specification.
{% /admonition %}

## Choose output format

Since Redocly CLI is already a fully-featured lint tool, additional features such as a choice of formats are already included.

Get a report in **Markdown format** with the following command:

```bash
redocly lint --format=markdown arazzo/museum-api.arazzo.yaml
```

Choose your preferred output format from `codeframe`, `stylish`, `json`, `checkstyle`, `codeclimate`, `github-actions`, `markdown`, or `summary`.
The [lint command  page](../commands/lint.md) has full details of the command's options.

## Add Arazzo linting to GitHub Actions

To make sure that your Arazzo description is valid and stays that way, add linting to your CI (Continuous Integration) setup.
The following snippet shows an example of configuring a GitHub action to use Redocly CLI with the `github-actions` output format to get annotations directly in your pull request if any validation problems are found:

```
name: Validate museum Arazzo descriptions

on: [pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Set up node
        uses: actions/setup-node@v4
      - name: Install Redocly CLI
        run: npm install -g @redocly/cli@latest
      - name: Run linting
        run: redocly lint arazzo/*yaml --format=github-actions
```

With this action in place, the intentional errors I added to the Arazzo description are shown as annotations on the pull request:

![Screenshot of annotation flagging "workfloo" as an unexpected value and suggesting "workflow"](images/museum-arazzo-lint.png)

## Participate in Redocly CLI

Redocly CLI is an open source project, so we invite you to check out the [code on GitHub](https://github.com/Redocly/redocly-cli/), and open issues to report problems or request features.
