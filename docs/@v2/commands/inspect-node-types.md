# `inspect-node-types`

{% admonition type="warning" name="Experimental" %}
`inspect-node-types` is an experimental feature.
Its flags and output can change in any minor release until the feature is stable.
Send us your feedback while we stabilize the feature.
{% /admonition %}

## Introduction

The `inspect-node-types` command shows the node type that Redocly CLI assigns to each place in an API description.

Node types are the vocabulary of [configurable rules](../rules/configurable-rules.md) and [custom plugins](../custom-plugins/index.md):

- a configurable rule targets a node type in its `subject`
- a plugin rule declares a visitor for a node type

Use `inspect-node-types` to find the right type name for the part of your description you want to check.

A node has a type only because of the path the linter took to reach it, so the command always walks the whole description from its root.
Nodes in referenced files appear at their own pointers, in their own files.

## Usage

```bash
redocly inspect-node-types <api> [--config=<path>]                  # list every node
redocly inspect-node-types <api> --pointer=<pointer> [--parents]    # ask about one location
redocly inspect-node-types <api> --type=<type> [--parents]          # ask about one type
redocly inspect-node-types <api> --summary                          # count the types used
```

The command answers one question at a time, so `--pointer`, `--type`, and `--summary` are mutually exclusive.
Passing two questions fails with `Arguments pointer and type are mutually exclusive`.
`--parents` is not a question of its own.
It changes the answer that `--pointer` or `--type` gives, and on its own it fails with `The --parents option requires --pointer or --type`.

## Options

| Option        | Type    | Description                                                                                                                                                                     |
| ------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| api           | string  | **REQUIRED.** Path to the root API description filename or alias. The whole description is walked from this file.                                                               |
| --config      | string  | Specify path to the [configuration file](../configuration/index.md).                                                                                                            |
| --help        | boolean | Display help.                                                                                                                                                                   |
| --lint-config | string  | Specify the severity level for the configuration file. <br/> **Possible values:** `warn`, `error`, `off`. Default: `warn`.                                                      |
| --parents     | boolean | Modifies `--pointer` or `--type`: display the chain of node types leading to the node, or the distinct chains that reach the type. Requires one of them.                        |
| --pointer     | string  | Look up a single node instead of listing all of them. A JSON pointer, optionally prefixed with a file: `#/paths` or `paths/orders.yaml#/get`. Not with `--type` or `--summary`. |
| --summary     | boolean | List the node types used in the description, with the number of nodes of each type. Not with `--pointer` or `--type`.                                                           |
| --type        | string  | List only the nodes of the given type, for example `--type=Schema`. Not with `--pointer` or `--summary`.                                                                        |
| --version     | boolean | Display version number.                                                                                                                                                         |

## Examples

### List every node

Without `--pointer`, the command prints every node in the description, with its type first:

```bash
redocly inspect-node-types cafe.yaml
```

```text
Root           cafe.yaml#/
Info           cafe.yaml#/info
Contact        cafe.yaml#/info/contact
Paths          cafe.yaml#/paths
PathItem       cafe.yaml#/paths/~1orders → paths/orders.yaml
PathItem       paths/orders.yaml#/
Operation      paths/orders.yaml#/get
ParameterList  paths/orders.yaml#/get/parameters
Parameter      paths/orders.yaml#/get/parameters/0 → components/parameters/Filter.yaml
Parameter      components/parameters/Filter.yaml#/
Schema         components/parameters/Filter.yaml#/schema
WebhooksMap    cafe.yaml#/webhooks
PathItem       cafe.yaml#/webhooks/orderCreated → paths/orders.yaml
```

A `$ref` site shows the pointer it resolves to after the `→` arrow.

### List the nodes of one type

Pass `--type` to see every place one type appears:

```bash
redocly inspect-node-types cafe.yaml --type=Schema
```

```text
Schema  components/parameters/Filter.yaml#/schema
```

### Summarize the types

Pass `--summary` to see which node types the description uses, with the number of nodes of each:

```bash
redocly inspect-node-types cafe.yaml --summary
```

```text
Contact        1
Info           1
Operation      1
Parameter      1
ParameterList  1
PathItem       1
Paths          1
Root           1
Schema         1
WebhooksMap    1
```

A `$ref` site is a pointer to a node, not a node of its own.
The count is the number of nodes the linter visits.
The list above shows three `PathItem` lines: two `$ref` sites and the one path item they both reach.
The summary counts that path item once.

### Look up one node

Pass a [JSON pointer](https://datatracker.ietf.org/doc/html/rfc6901) to get a single type.
Remember that `/` inside a path or property name is escaped as `~1`:

```bash
redocly inspect-node-types cafe.yaml --pointer='#/paths/~1orders'
```

```text
PathItem
```

A `$ref` and the node it resolves to are the same type, so pointing at either one works.

If the pointer doesn't match a node, the command reports the closest node on that path and suggests its children — pointing at a plain field, like `#/info/title`, names the node that holds it.

### See the chain from the root to a node

Add `--parents` to a pointer lookup to get every level above the node.
The chain is the vocabulary of a configurable rule's `where` list, which names ancestors from the root down:

```bash
redocly inspect-node-types cafe.yaml --pointer='components/parameters/Filter.yaml#/schema' --parents
```

```text
Root → Paths → PathItem → Operation → ParameterList → Parameter → Schema
Root → WebhooksMap → PathItem → Operation → ParameterList → Parameter → Schema
```

A node reached through more than one `$ref` can sit under more than one chain, and the command prints one line per chain.
Routes that pass through the same types collapse into a single line.

### See every way to reach a type

Add `--parents` to `--type` to get the distinct chains that lead to that type, each ending at the type itself:

```bash
redocly inspect-node-types cafe.yaml --type=PathItem --parents
```

```text
Root → Paths → PathItem
Root → WebhooksMap → PathItem
```

Inspect this before you write a rule for a type: it shows which places a rule targeting that type reaches.
This way, you can add a `where` gate for the ones you mean and exclude the rest.
In this example a rule about the shape of a URL path needs a `Paths` gate, because the same type also holds webhook names.

The command reports what this description contains, not everything the specification allows.
A description with no webhooks shows no webhook chain.
Check a description that exercises the areas you care about.

### Look up a node in a referenced file

Prefix the pointer with the file, relative to the directory you run the command from.
The API argument stays the root of the description:

```bash
redocly inspect-node-types cafe.yaml --pointer='paths/orders.yaml#/get/parameters/0'
```

```text
Parameter
```

If the file is not referenced from the root, the command reports that it found nothing and exits with a non-zero code.
