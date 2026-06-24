# `tree`

## Introduction

The `tree` command prints the structure of an API description: its paths, operations, and the component dependency chains between them through `$ref`.
The default view bundles the description first, so a multi-file API shows the same full tree as its single-file form.
The command works fully with OpenAPI 2.0 and 3.x.
AsyncAPI and Arazzo descriptions are supported too, but render as a flat list of their top-level referenced (`$ref`) components rather than a paths and operations tree.

Use `tree` to:

- Get quick orientation in any API, whether single-file or multi-file.
- Run impact analysis with `--used-by` — which paths and operations use a given component or file.
  This analysis is useful in CI and automated code review.
- Produce machine-readable JSON, a Mermaid diagram, or a Graphviz DOT graph with `--format`.
- View the file-level `$ref` graph with `--files`.

## Usage

```bash
redocly tree
redocly tree <api>
redocly tree <api> [--format=<value>] [--used-by=<value>] [--output=<file>] [--config=<path>]
redocly tree --files [apis...]
```

With no API argument, the command takes the API from the Redocly configuration file.
The default structure view displays one API at a time.
Use `--files` for the multi-API file graph.

## Options

| Option        | Type     | Description                                                                                                                                                                                                                                                                      |
| ------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| apis          | [string] | In default mode, exactly one API description file or alias. In `--files` mode, one or more files or aliases. Defaults to APIs from the Redocly configuration file.                                                                                                               |
| --config      | string   | Specify the path to the [Redocly configuration file](../configuration/index.md).                                                                                                                                                                                                 |
| --files       | boolean  | Display the file-level `$ref` graph instead of the document structure.                                                                                                                                                                                                           |
| --format      | string   | Output format: `stylish` (default, tree view), `json`, `mermaid`, or `dot`.                                                                                                                                                                                                      |
| --help        | boolean  | Display help.                                                                                                                                                                                                                                                                    |
| --lint-config | string   | Specify the severity level for the configuration file. <br/> **Possible values:** `warn`, `error`, `off`. Default value is `warn`.                                                                                                                                               |
| --output, -o  | string   | Write the output to a file instead of `stdout`.                                                                                                                                                                                                                                  |
| --used-by     | [string] | Display only the part of the tree that uses (depends on) the given components, paths, or files. The default view accepts a JSON pointer, shorthand pointer, bare component name, or file path. `--files` mode accepts file paths only. Repeat the option to pass several values. |
| --version     | boolean  | Display version number.                                                                                                                                                                                                                                                          |

## Examples

### Print the structure of an API description

```bash
redocly tree cafe.yaml
```

```treeview
cafe.yaml
├── /menu
│   └── GET
│       ├── responses/BadRequest
│       │   └── schemas/Error
│       └── schemas/MenuItemList
│           ├── schemas/MenuItem
│           │   ├── schemas/Beverage
│           │   │   └── schemas/MenuBaseItem
│           │   └── schemas/Dessert
│           │       └── schemas/MenuBaseItem
│           └── schemas/Page
├── /orders
│   ├── GET
│   │   └── schemas/OrderList
│   │       └── schemas/Order
│   └── POST
│       └── schemas/Order
└── … (other paths)
```

The tree above is abbreviated for readability — shared parameters and the repeated error responses are omitted.
An operation is shown as the method only (`GET`) under its path, since the path is its parent.

Markers legend:

- `↺` — a cycle: the node references one of its ancestors (a recursive schema). It is not expanded again. A node that simply appears in more than one place (fan-in) is shown without a marker.
- `✗ not found` — an unresolvable `$ref` (only in `--files` mode; in the default view an unresolvable `$ref` is an error, see below)
- `(external)` — a reference to a URL

The default view bundles the description, so components and operations split across files are resolved to their canonical place.
A multi-file API therefore produces the same tree as its single-file equivalent — operations and named components, not file nodes.

### Find what uses a component, path, or file

Pass one or more components, paths, or files to `--used-by` to see only the part of the tree that depends on them:

```bash
redocly tree cafe.yaml --used-by schemas/Order
```

```treeview
cafe.yaml
├── /orders
│   ├── GET
│   │   └── schemas/OrderList
│   │       └── schemas/Order│   └── POST
│       └── schemas/Order└── /orders/{orderId}
    ├── GET
    │   └── schemas/Order    └── PATCH
        └── schemas/Order
4 of 12 operations affected · affected paths: /orders, /orders/{orderId}
```

`--used-by` accepts several input forms:

- full JSON pointer: `#/components/schemas/Order`
- shorthand pointer (the node id): `schemas/Order`
- bare component name: `Order` — ambiguous bare names match all candidates and print a note to `stderr`
- a file path (in `--files` mode): `components/schemas/Order.yaml`
- the root file itself: the whole tree is affected

The summary line reports how many operations are affected.
A change that only affects path-level parameters can report `0 of N operations affected` while still listing the affected path: the path itself is impacted, not its operations.
For AsyncAPI or Arazzo descriptions, which have no operation nodes, the summary counts nodes instead — for example, `5 of 8 nodes affected`.

A file path that matches no node prints a warning and points you to `--files`; other unknown inputs print a warning. Both exit with code `0`.

### Machine-readable output

```bash
redocly tree cafe.yaml --format=json
```

Prints the graph as JSON in the common `nodes`/`links` shape (compatible with D3, force-graph, and similar tools). Every node carries `resolved` and `external`; `kind` and `file` are present in the default view. Each link carries the exact `$ref` strings.

```bash
redocly tree cafe.yaml --format=mermaid
```

Prints a [Mermaid](https://mermaid.js.org/) `flowchart` definition.

```bash
redocly tree cafe.yaml --format=dot
```

Prints a [Graphviz](https://graphviz.org/) `digraph`, consumable by Graphviz and most graph-drawing tools.

### Write the output to a file

Use `--output` (`-o`) to write any format to a file instead of `stdout`:

```bash
redocly tree cafe.yaml --format=mermaid --output cafe.mmd
```

### Invalid descriptions

The default view bundles the description before walking it.
If the description cannot be bundled — for example, it has unresolvable or invalid `$ref`s — `tree` prints the bundling problems and exits with a non-zero code instead of printing a partial tree.

### File-level graph

```bash
redocly tree cafe.yaml --files
```

```treeview
cafe.yaml
├── paths/menu.yaml
│   ├── components/parameters/Limit.yaml
│   ├── components/responses/BadRequest.yaml
│   │   └── components/schemas/Error.yaml
│   └── components/schemas/MenuItemList.yaml
│       └── components/schemas/MenuItem.yaml
└── paths/orders.yaml
    └── components/schemas/OrderList.yaml
        └── components/schemas/Order.yaml
```

The tree above is abbreviated; the real output lists every file.
`--files` displays only which files reference other files — not the paths, operations, and components inside them.
Paths are shown relative to the directory of the root description, so the folder you run the command from does not appear as a prefix.
The default view already traverses those elements, following `$ref`s across files.
`--files` also accepts multiple APIs in one run, merging their graphs.
In this mode, `--used-by` takes file paths, and the summary counts affected files and roots.
