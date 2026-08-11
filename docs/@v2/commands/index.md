---
tocMaxDepth: 2
---

# Redocly CLI commands

Documentation commands:

- [`preview`](preview.md) Start a local preview of a Redocly project with one of the product NPM packages.
- [`translate`](translate.md) Generate translation keys for a Redocly Realm, Reef, or Revel project.
- [`eject`](eject.md) Eject and modify components from the core theme in a Redocly Realm, Reef, or Revel project.
- [`build-docs`](build-docs.md) Build an API description into an HTML file.

API management commands:

- [`bundle`](bundle.md) Bundle an API description.
- [`generate-client`](generate-client.md) Generate a typed TypeScript client from an OpenAPI description [experimental feature].
- [`eject-generator`](eject-generator.md) Copy a built-in client generator into your repository as an editable file [experimental feature].
- [`join`](join.md) Join API descriptions [experimental feature].
- [`score`](score.md) Score an API for integration simplicity and AI agent readiness.
- [`split`](split.md) Split an API description into a multi-file structure.
- [`stats`](stats.md) Gather statistics for a document.

Linting commands:

- [`lint`](lint.md) Lint an API description.
- [`check-config`](check-config.md) Lint the Redocly configuration file.

Testing commands:

- [`respect`](respect.md) Execute API tests described in an Arazzo description.
- [`generate-arazzo`](generate-arazzo.md) Generate an Arazzo description from an OpenAPI description.
- [`drift`](drift.md) Detect drift between recorded HTTP traffic and an OpenAPI description [experimental feature].
- [`proxy`](proxy.md) Capture live HTTP traffic through a reverse proxy into a HAR file [experimental feature].
- [`generate-spec`](generate-spec.md) Infer an OpenAPI description from recorded HTTP traffic [experimental feature].

Redocly platform commands:

- [`login`](login.md) Log in to Reunite.
- [`logout`](logout.md) Clear your stored credentials.
- [`push`](push.md) Push an API description to Reunite.
- [`push-status`](push-status.md) Track an in-progress push operation to Reunite.

Supporting commands:

- [`completion`](completion.md) Generate autocomplete commands (includes install instructions).

## Additional options

All commands support these parameters:

`--version` displays the current version of `redocly`.

`--help` displays the help for the command.
If you used a subcommand, it displays the help for that subcommand.
For example:

```bash
npx @redocly/cli@latest lint --help
```

Try these with any of the other commands.

## Config file

Redocly CLI has one primary configuration file (`redocly.yaml`), also called the Redocly configuration file.
This file defines all of the configuration options available to you.
These options include the location of your files (for unbundling and bundling) and the linting rules (for validation against the OpenAPI Specification).

The Redocly configuration file must be in your root directory.
If Redocly CLI finds `redocly.yaml` in the root directory, it uses the options set in that file when it executes commands.

For most commands, you can also specify a configuration file with `--config myconfig.yaml` as part of the command.
For example:

```bash
npx @redocly/cli@latest lint --config redocly-official.yaml openapi.yaml
```

For more information, refer to the [Redocly configuration file](../configuration/index.md) docs.
