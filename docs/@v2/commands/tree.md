# `tree`

## Introduction

The `tree` command prints the structure of an API description: its paths, operations, and the component dependency chains between them through `$ref`. It works fully with OpenAPI 2.0 and 3.x. AsyncAPI and Arazzo descriptions are supported too, but render as a flat list of their top-level `$ref`'d components rather than a paths and operations tree.

Use it to:

- get quick orientation in any API, whether single-file or multi-file;
- run impact analysis with `--affected-by` — which paths and operations are affected by a change to a component or file, useful in CI and automated code review;
- produce machine-readable JSON or a Mermaid diagram with `--format`;
- view the file-level `$ref` graph with `--files`.

## Usage

```bash
redocly tree
redocly tree <api>
redocly tree <api> [--format=<value>] [--affected-by=<value>] [--config=<path>]
redocly tree --files [apis...]
```

With no API argument, the command takes the API from the Redocly configuration file. The default structure view shows one API at a time — use `--files` for the multi-API file graph.

## Options

| Option        | Type     | Description                                                                                                                                                                      |
| ------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| apis          | [string] | In default mode, exactly one API description file or alias. In `--files` mode, one or more files or aliases. Defaults to APIs from the Redocly configuration file.               |
| --affected-by | [string] | Show only the part of the tree affected by changes to the given components, paths, or files. Repeat the option to pass several values: `--affected-by Pet --affected-by /users`. |
| --config      | string   | Specify the path to the [Redocly configuration file](../configuration/index.md).                                                                                                 |
| --files       | boolean  | Show the file-level `$ref` graph instead of the document structure.                                                                                                              |
| --format      | string   | Output format: `stylish` (default, tree view), `json`, or `mermaid`.                                                                                                             |
| --help        | boolean  | Show help.                                                                                                                                                                       |
| --lint-config | string   | Specify the severity level for the configuration file. <br/> **Possible values:** `warn`, `error`, `off`. Default value is `warn`.                                               |
| --version     | boolean  | Show version number.                                                                                                                                                             |

## Examples

### Print the structure of an API description

```bash
redocly tree openapi.yaml
```

```treeview
openapi.yaml
├── /pets
│   ├── GET /pets
│   │   └── schemas/Pet
│   │       └── schemas/Address
│   └── POST /pets
│       └── schemas/PetInput
│           └── schemas/Pet ↺
├── /pets/{petId}
│   ├── GET /pets/{petId}
│   │   └── schemas/Pet ↺
│   └── parameters/PetId
└── /users
    └── GET /users
        └── schemas/User
            └── schemas/Address ↺
```

Markers legend:

- `↺` — the node was already expanded earlier in the tree; its dependencies are not repeated. This is also how recursive schemas render.
- `✗ not found` — an unresolvable `$ref`.
- `(external)` — a reference to a URL.

For multi-file APIs, components living in other files appear as file nodes (for example, `paths/pets.yaml`). Operations defined inside a `$ref`'d path-item file are represented by that file node, not expanded individually.

### Find what a change affects

Pass a component pointer, name, or file path to `--affected-by` to see only the impacted part of the tree — useful in CI and automated review.

```bash
redocly tree openapi.yaml --affected-by '#/components/schemas/Address'
```

```treeview
openapi.yaml
├── /pets
│   ├── GET /pets
│   │   └── schemas/Pet
│   │       └── schemas/Address ← changed
│   └── POST /pets
│       └── schemas/PetInput
│           └── schemas/Pet ↺
├── /pets/{petId}
│   └── GET /pets/{petId}
│       └── schemas/Pet ↺
└── /users
    └── GET /users
        └── schemas/User
            └── schemas/Address ↺ ← changed

4 of 4 operations affected · affected paths: /pets, /pets/{petId}, /users
```

`--affected-by` accepts several input forms:

- Full JSON pointer: `#/components/schemas/Address`
- Shorthand pointer: `schemas/Address`
- Bare component name: `Address` — ambiguous bare names match all candidates and print a note to stderr (impact analysis over-reports rather than under-reports)
- A file path (for multi-file specs): `schemas/address.yaml`
- The root file itself: the whole tree is affected

The summary line reports how many operations are affected. A change that only affects path-level parameters can report `0 of N operations affected` while still listing the affected path — the path itself is impacted, not its operations. When the tree has no operation nodes at all (an AsyncAPI or Arazzo description, or a multi-file OpenAPI description whose path items live in `$ref`'d files), the summary falls back to counting nodes, for example `5 of 8 nodes affected`.

Unknown inputs print a warning to stderr and exit with code `0`.

### Machine-readable output

```bash
redocly tree openapi.yaml --format=json
```

Prints the structure as JSON with `roots`, `nodes` (including `kind`, `file`, `resolved`, and `external` fields), and `edges` (including the exact `$ref` strings). Only the JSON is written to stdout, so the output is safe to pipe.

```bash
redocly tree openapi.yaml --format=mermaid
```

Prints a [Mermaid](https://mermaid.js.org/) `flowchart` definition. GitHub renders Mermaid code blocks in Markdown automatically, so you can paste the output into a pull request comment or documentation page to get a diagram.

### File-level graph

```bash
redocly tree openapi.yaml --files
```

```treeview
openapi.yaml
├── paths/pets.yaml
│   └── components/schemas/Pet.yaml
└── paths/users.yaml
    └── components/schemas/User.yaml
        ├── components/schemas/Address.yaml
        └── components/schemas/Pet.yaml ↺
```

This is the multi-file `$ref` view: it shows which files reference which other files. The `--files` flag supports multiple APIs in a single run.
