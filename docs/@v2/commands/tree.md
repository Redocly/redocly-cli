# `tree`

## Introduction

The `tree` command prints the structure of an API description: its paths, operations, and the component dependency chains between them through `$ref`.
The command works fully with OpenAPI 2.0 and 3.x.
AsyncAPI and Arazzo descriptions are supported too, but render as a flat list of their top-level referenced (`$ref`)components rather than a paths and operations tree.

Use `tree` to:

- Get quick orientation in any API, whether single-file or multi-file.
- Run impact analysis with `--affected-by` — which paths and operations are affected by a change to a component or file.
  This analysis is useful in CI and automated code review.
- Produce machine-readable JSON or a Mermaid diagram with `--format`.
- View the file-level `$ref` graph with `--files`.

## Usage

```bash
redocly tree
redocly tree <api>
redocly tree <api> [--format=<value>] [--affected-by=<value>] [--config=<path>]
redocly tree --files [apis...]
```

With no API argument, the command takes the API from the Redocly configuration file.
The default structure view displays one API at a time.
Use `--files` for the multi-API file graph.

## Options

| Option        | Type     | Description                                                                                                                                                                                                                                                                              |
| ------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| apis          | [string] | In default mode, exactly one API description file or alias. In `--files` mode, one or more files or aliases. Defaults to APIs from the Redocly configuration file.                                                                                                                       |
| --affected-by | [string] | Display only the part of the tree affected by the given changes. The default view accepts a JSON pointer, shorthand pointer, bare component name, or file path. `--files` mode accepts file paths only. Repeat the option to pass several values: `--affected-by Pet --affected-by /users`. |
| --config      | string   | Specify the path to the [Redocly configuration file](../configuration/index.md).                                                                                                                                                                                                         |
| --files       | boolean  | Display the file-level `$ref` graph instead of the document structure.                                                                                                                                                                                                                      |
| --format      | string   | Output format: `stylish` (default, tree view), `json`, or `mermaid`.                                                                                                                                                                                                                     |
| --help        | boolean  | Display help.                                                                                                                                                                                                                                                                               |
| --lint-config | string   | Specify the severity level for the configuration file. <br/> **Possible values:** `warn`, `error`, `off`. Default value is `warn`.                                                                                                                                                       |
| --version     | boolean  | Display version number.                                                                                                                                                                                                                                                                     |

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
- `↺` — the node was already expanded earlier in the tree. Its dependencies are not repeated. This is also how recursive schemas render.
- `✗ not found` — an unresolvable `$ref`
- `(external)` — a reference to a URL

For multi-file APIs, components living in other files appear as file nodes (for example, `paths/pets.yaml`).
Operations defined inside a `$ref`'d path-item file are represented by that file node, not expanded individually.

### Find what a change affects

Pass one or more components, paths, or files to `--affected-by` to see only the impacted part of the tree:

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
- Shorthand pointer (the node id, without `#/components/`): `schemas/Address`
- Bare component name: `Address` — ambiguous bare names match all candidates and print a note to stderr (impact analysis over-reports rather than under-reports)
- A file path (for multi-file specs): `schemas/address.yaml`
- full JSON pointer: `#/components/schemas/Address`
- shorthand pointer (the node id, without `#/components/`): `schemas/Address`
- bare component name: `Address` — ambiguous bare names match all candidates and print a note to `stderr` (impact analysis over-reports rather than under-reports)
- a file path (for multi-file specs): `schemas/address.yaml`
- the root file itself: the whole tree is affected

The summary line reports how many operations are affected.
A change that only affects path-level parameters can report `0 of N operations affected` while still listing the affected path. The path itself is impacted, not its operations.
When the tree has no operation nodes at all (an AsyncAPI or Arazzo description, or a multi-file OpenAPI description whose path items live in `$ref`'d files), the summary falls back to counting nodes. 
For example: `5 of 8 nodes affected`.

Unknown inputs print a warning to `stderr` and exit with code `0`.

### Machine-readable output

```bash
redocly tree openapi.yaml --format=json
```

Prints the graph as JSON with `roots`, `nodes` (`resolved` and `external` on every node; `kind` and `file` in the default view only), and `edges` (with the exact `$ref` strings).
Only the JSON is written to `stdout`, so the output is safe to pipe.

```bash
redocly tree openapi.yaml --format=mermaid
```

Prints a [Mermaid](https://mermaid.js.org/) `flowchart` definition.

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

`--files` displays only which files reference other files - not the paths, operations, and components inside them.
The default view already traverses those elements, following `$ref`s across files.
`--files` also accepts multiple APIs in one run, merging their graphs.
In this mode, `--affected-by` takes file paths, and the summary counts affected files and roots.
