# Migrate to Redocly CLI from swagger-cli

Redocly CLI is the recommended replacement for the deprecated [swagger-cli](https://www.npmjs.com/package/swagger-cli) package. This guide shows you how to replace the old commands with Redocly CLI commands. Redocly CLI is built for OpenAPI but you can assume that Swagger 2.0 is also supported when the documentation refers to an OpenAPI description. We know those existing APIs are still working hard in many places!

{% admonition type="success" name="Modern API tooling" %}
Redocly CLI is open source and actively maintained, supporting newer versions of OpenAPI (3.1) and continuing to evolve. It also provides extensive [linting](../api-standards.md) options, easy and beautiful [API reference documentation](../api-docs.md), and plenty of extensibility with [custom plugins](../custom-plugins/index.md).
{% /admonition %}

## Validate OpenAPI/Swagger files

Redocly CLI lints your OpenAPI file, checking that it is valid and also making recommendations to improve your OpenAPI descriptions.
While you have multiple options for [using Redocly CLI for better API standards](../api-standards.md) let’s start with replacing the old command with the new command for linting with the [minimal](../rules/minimal.md) ruleset.

If the old command was:

```sh
swagger-cli validate openapi.yml
```

Then the new command is:

```sh
redocly lint --extends=minimal openapi.yml
```

You can run these commands locally, as part of your CI (continuous integration) pipeline, or (ideally) both.

### Structure validation only

In some cases, checking additional rules during lint is less useful. For instance, in the case of legacy APIs that are no longer updated to meet more modern API expectations. To restrict Redocly to only checking that the API description meets the expected structure for OpenAPI, use a `redocly.yaml` file to configure a ruleset that contains only the `struct` rule.

The configuration in the `redocly.yaml` file should look like this:

```yaml
extends: []

rules:
  struct: error
```

Redocly CLI automatically detects the `redocly.yaml` configuration file, so your command should be:

```sh
redocly lint openapi.yml
```

You can add more [built-in rules](../rules/built-in-rules.md) by adding them in the configuration file, and adjust the level of the messages by using `warn` rather than `error`.

Learn more about [configuring Redocly CLI](../configuration/index.md) in the documentation.

## Bundle OpenAPI/Swagger into a single file

While the OpenAPI (and earlier Swagger) standards were designed to use `$ref` reference syntax and re-use elements of API descriptions across mulitple files, not all tools support this. If there's a tool in your API lifecycle that needs a single file, you can still use mulitple files for the day-to-day work, and then "bundle" the API description into a single file for use by another tool.

With `swagger-cli` the command would be something like this:

```sh
swagger-cli bundle openapi.yml
```

With Redocly CLI the command to create a single file is:

```sh
redocly bundle openapi.yml
```

Both commands have additional options; here's a quick reference on how to replace the old with the new:

- Keep `-o` or replace `--outfile` with `--output` to direct the command output to a filename.
- Replace the `-t` or `--type` argument with `--ext` for the file type to output. Redocly CLI also detects the correct format from the output filename, so this option isn't needed for file output, but can be useful if outputting to stdout.
- Replace `-r` or `--dereference` with `-d` or `--dereferenced` to output a file with all `$ref`s resolved.

## Get the best from Redocly CLI

Redocly CLI has more functionality than `swagger-cli` did, so if that sounds interesting you should [visit the main docs](../index.md) and see if there's anything you'd like to add to your own workflows.
