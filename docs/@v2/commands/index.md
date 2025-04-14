---
tocMaxDepth: 2
---

# Redocly CLI commands

Documentation commands:

- [`preview`](preview.md) Start a local preview of a Redocly project with one of the product NPM packages.
- [`translate`](translate.md) Generate translation keys for a Redocly Realm, Reef, or Revel project.
- [`eject`](eject.md) Eject and modify components from the core theme in a Redocly Realm, Reef, or Revel project.
- [`build-docs`](build-docs.md) Build API description into an HTML file.

API management commands:

- [`stats`](stats.md) Gather statistics for a document.
- [`bundle`](bundle.md) Bundle API description.
- [`split`](split.md) Split API description into a multi-file structure.
- [`join`](join.md) Join API descriptions [experimental feature].

Linting commands:

- [`lint`](lint.md) Lint API description.
- [`check-config`](check-config.md) Lint Redocly configuration file.

Testing commands:

- [`respect`](respect.md) Execute API tests described in an Arazzo description.
- [`generate-arazzo`](generate-arazzo.md) Generate an Arazzo description from an OpenAPI description.

Redocly platform commands:

- [`login`](login.md) Log in to Reunite.
- [`logout`](logout.md) Clear your stored credentials.
- [`push`](push.md) Push an API description to Reunite.
- [`push-status`](push-status.md) Track an in-progress push operation to Reunite.

Supporting commands:

- [`completion`](completion.md) Generate autocomplete commands (includes install instructions).

## Additional options

There are some parameters supported by all commands:

`--version` display the current version of `redocly`.

`--help` display the command help, or the help for the subcommand if you used one. For example:

```bash
npx @redocly/cli@latest lint --help
```

Try these with any of the other commands.

## Config file

Redocly CLI comes with one primary configuration file (`redocly.yaml`), also known as the Redocly configuration file.
This file defines all of the config options available to you, including the location of your files (for unbundling and bundling), and linting rules (for validation against the OpenAPI Specification).

The Redocly configuration file must sit in your root directory.
If Redocly CLI finds `redocly.yaml` in the root directory, it uses the options set in that file when executing commands.

You can also specify a config file to most commands using `--config myconfig.yaml` as part of the command. For example:

```bash
npx @redocly/cli@latest lint --config redocly-official.yaml openapi.yaml
```

For more information, refer to the [Redocly configuration file](../configuration/index.md) docs.
