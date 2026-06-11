# `graph`

## Introduction

The `graph` command prints the file-level dependency graph of an API description: which files reference which other files through `$ref`. It works with multi-file OpenAPI, AsyncAPI, and Arazzo descriptions.

Use it to:

- get a quick `tree`-style overview of a multi-file API description;
- find out which files are affected by a change to a shared file (`--affected-by`) — for example, in CI or automated code review;
- feed exact file relationships to tooling as JSON or render them as a Mermaid diagram.

## Usage

```bash
redocly graph
redocly graph <apis...>
redocly graph <apis...> [--format=<value>] [--affected-by=<file>] [--config=<path>]
```

If you don't pass any API to the command, it processes all APIs defined in your Redocly configuration file and prints them as a single graph with shared files deduplicated — one tree per API root in the default view.

## Options

| Option        | Type     | Description                                                                                                                                                                                                              |
| ------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| apis          | [string] | Paths to API description files. Defaults to all APIs from the Redocly configuration file.                                                                                                                                |
| --affected-by | [string] | Show only the part of the graph affected by changes to the given files: the files themselves plus everything that references them. Repeat the option to pass several files: `--affected-by a.yaml --affected-by b.yaml`. |
| --config      | string   | Specify the path to the [Redocly configuration file](../configuration/index.md).                                                                                                                                         |
| --format      | string   | Output format: `stylish` (default, tree view), `json`, or `mermaid`.                                                                                                                                                     |
| --help        | boolean  | Show help.                                                                                                                                                                                                               |
| --lint-config | string   | Specify the severity level for the configuration file. <br/> **Possible values:** `warn`, `error`, `off`. Default value is `warn`.                                                                                       |
| --version     | boolean  | Show version number.                                                                                                                                                                                                     |

## Examples

### Print the dependency tree

```bash
redocly graph openapi.yaml
```

```
openapi.yaml
├── paths/pets.yaml
│   └── components/schemas/Pet.yaml
└── paths/users.yaml
    └── components/schemas/User.yaml
        ├── components/schemas/Address.yaml
        └── components/schemas/Pet.yaml ↺
```

The `↺` marker means the file was already expanded earlier in the tree, so its references are not repeated. Files that cannot be resolved are marked with `✗ not found`, and references to URLs are marked with `(external)`.

### Find files affected by a change

Pass a changed file to `--affected-by` to see only the impacted part of the graph — useful in CI and automated review to decide what needs attention without reading every file. Repeat the option to pass several changed files at once.

```bash
redocly graph openapi.yaml --affected-by components/schemas/Address.yaml
```

```
openapi.yaml
└── paths/users.yaml
    └── components/schemas/User.yaml
        └── components/schemas/Address.yaml ← changed

4 of 6 files affected · affected roots: openapi.yaml
```

If a file passed to `--affected-by` is not referenced by any processed API, the command prints a warning to stderr and exits with code `0` — "nothing depends on this file" is a valid answer.

### Machine-readable output

```bash
redocly graph openapi.yaml --format=json
```

Prints the graph as JSON with `roots`, `nodes` (including `resolved` and `external` flags), and `edges` (including the exact `$ref` strings). Only the JSON is written to stdout, so the output is safe to pipe.

```bash
redocly graph openapi.yaml --format=mermaid
```

Prints a [Mermaid](https://mermaid.js.org/) `flowchart` definition. GitHub renders Mermaid code blocks in Markdown automatically, so you can paste the output into a pull request comment or documentation page to get a diagram.
