---
tocMaxDepth: 2
---

# OpenAPI CLI commands

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

OpenAPI CLI comes with one primary configuration file (`redocly.yaml`), also known as the Redocly configuration file. 
This file defines all of the config options available to you, including the location of your files (for unbundling and bundling), and linting rules (for validation against the OpenAPI Specification).

The Redocly configuration file must sit in your root directory (`openapi` by default unless you renamed it). 
If OpenAPI CLI finds `redocly.yaml` in the root directory, it will use the options set in that file when executing commands.

For more information, refer to the [Redocly configuration file](../configuration/configuration-file.mdx) docs.


::: success Tip

If you want to use a different config file with a specific command (and override `redocly.yaml`), use the `--config` option and provide the path to the file.

:::
