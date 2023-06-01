---
tocMaxDepth: 2
---

# Redocly CLI commands

Documentation commands:

* [`preview-docs`](preview-docs.md) Preview API reference docs for the specified definition.
* [`build-docs`](build-docs.md) Build definition into an HTML file.

API management commands:

* [`stats`](stats.md) Gathering statistics for a document.
* [`bundle`](bundle.md) Bundle definition.
* [`split`](split.md) Split definition into a multi-file structure.
* [`join`](join.md) Join definitions [experimental feature].

Linting commands:

* [`lint`](lint.md) Lint definition.

Redocly platform commands:

* [`login`](login.md) Login to the Redocly API registry with an access token.
* [`logout`](logout.md) Clear your stored credentials for the Redocly API registry.
* [`push`](push.md) Push an API definition to the Redocly API registry.

Supporting commands:
* `completion` Generate completion script (includes install instructions).


## Additional options

There are some parameters supported by all commands:

`--version` displays the current version of `redocly`.

`--help` displays the command help, or the help for the subcommand if you used one. For example:

```bash
redocly lint --help
```

Try these with any of the other commands.

## Config file

Redocly CLI comes with one primary configuration file (`redocly.yaml`), also known as the Redocly configuration file.
This file defines all of the config options available to you, including the location of your files (for unbundling and bundling), and linting rules (for validation against the OpenAPI Specification).

The Redocly configuration file must sit in your root directory.
If Redocly CLI finds `redocly.yaml` in the root directory, it uses the options set in that file when executing commands.

You can also specify a config file to most commands using `--config myconfig.yaml` as part of the command. For example:

```bash
redocly lint --config redocly-official.yaml openapi.yaml
```

For more information, refer to the [Redocly configuration file](../configuration/index.mdx) docs.
