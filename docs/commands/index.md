---
tocMaxDepth: 2
---
# OpenAPI CLI commands

## The available commands
Redocly OpenAPI CLI currently supports the following commands:

* [bundle](bundle.md)
* [join](join.md)
* [lint](lint.md) 
* [login](login.md)
* [logout](logout.md)
* [preview-docs](preview-docs.md)
* [push](push.md)
* [split](split.md)
* [stats](stats.md)

## How configuration impacts commands
OpenAPI CLI comes with two default configuration files:

`redocly.yaml`
This is the primary config file. It defines all of the config options including the location of your files (for unbundling and bundling) and linting rules (for validation against the OpenAPI Specification). This file always needs to sit in your root directory (`openapi` by default unless you renamed it).

`redocly.lint-ignore.yaml`
Gives you the ability to ignore specific linting messages.

If OpenAPI CLI finds at least one config file in the root directory, it will use the options set in that file when executing commands.

::: success Tip
If you want to reference a different config file during a command (and override `redocly.yaml`), use the `--config` option and provide the path to the file.
:::