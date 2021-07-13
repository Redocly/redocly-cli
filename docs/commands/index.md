---
tocMaxDepth: 2
---
# Redocly OpenAPI CLI commands

Redocly OpenAPI CLI currently supports the following commands:

- [bundle](bundle.md)
- [join](join.md)
- [lint](lint.md)
- [login](login.md)
- [logout](logout.md)
- [preview-docs](preview-docs.md)
- [push](push.md)
- [split](split.md)
- [stats](stats.md)


The following configuration files define the behavior of the CLI tool:

- `.redocly.yaml` - used to define the location of your root files, linting rules, and reference docs configuration information.
- `.redocly.lint-ignore.yaml` - used to ignore specific lint messages.

The CLI tool looks for configuration files in the current working directory. If it detects them, it will use the options set in those configuration files for the commands. Learn more about the [configuration file structure and options](../configuration/index.mdx).

When executing any of the commands, you can override the default configuration file by providing a path to another configuration file with the `--config` option.
