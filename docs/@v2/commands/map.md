# `map`

## Introduction

The `map` command generates a structural map of an API description:
a hierarchical tree that mirrors the document, like a sitemap for API tooling and agents.
Every node in the tree represents a retrievable section of the description — an operation, a channel, a named component, a webhook, a server, or a tag — and is addressed by a canonical JSON pointer.

{% admonition type="warning" name="OpenAPI and AsyncAPI only" %}
The `map` command is considered an experimental feature.
This means it's still a work in progress and may go through major changes.

It supports OpenAPI 2.0 through 3.2 and AsyncAPI 2.x and 3.0 descriptions.
{% /admonition %}

The API map is designed as a compact index that tools — including LLM-based agents — can navigate to decide which parts of an API description to retrieve,
instead of processing the whole document.
The tree structure and node summaries are extracted deterministically from the description itself;
no external services are involved unless you opt into [AI refinement](#ai-providers) with `--with-ai`.

Each node has the following fields:

| Field   | Type   | Description                                                                                                                                                                                                                                                                                                       |
| ------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| title   | string | Human-readable name: the API title, path, `operationId`, channel address, component name, tag name, or server URL.                                                                                                                                                                                                |
| kind    | string | Node type name from Redocly's internal type system, for example `Root`, `Info`, `Server`, `Tag`, `Paths`, `PathItem`, `Operation`, `Channel`, `Components`, `NamedSchemas`, or `Schema`.                                                                                                                          |
| pointer | string | Canonical JSON pointer that identifies and addresses the node, for example `#/paths/~1menu/get`.                                                                                                                                                                                                                  |
| summary | string | Optional. The node's `summary` field, its `description` truncated at a word boundary (about 200 characters), or a summary derived from the node's structure when neither is present — for example `Returns 200 (MenuItemList). Parameters: limit, sort.` for an operation, or `object: name, price` for a schema. |
| method  | string | Optional. HTTP method; present on OpenAPI `Operation` nodes only.                                                                                                                                                                                                                                                 |
| path    | string | Optional. URL path; present on OpenAPI `Operation` nodes under `paths` only.                                                                                                                                                                                                                                      |
| source  | object | Optional. Original `{ file, pointer, startLine, startCol, endLine, endCol }` location of the node; present when `--source-locations` is used.                                                                                                                                                                     |
| nodes   | array  | Child nodes.                                                                                                                                                                                                                                                                                                      |

The tree stops at operations, channels, and named components;
parameters, responses, messages payloads, and schema internals are the node's content, retrievable through its pointer.

{% admonition type="info" name="Pointers are logical" %}
Pointers address the logical document structure as authored.
For multi-file descriptions, note that `redocly bundle` may store referenced components under different keys;
use `--source-locations` when you need the exact file and location of each node.
{% /admonition %}

## Usage

```bash
redocly map <api>
redocly map <api> [--format=<option>] [--source-locations] [--config=<path>]
redocly map <api> --pointer=<json-pointer>
redocly map <api> --with-ai [--ai-provider=<provider>] [--ai-model=<model>]
redocly map --version
```

## Options

| Option             | Type    | Description                                                                                                                        |
| ------------------ | ------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| api                | string  | **REQUIRED.** Path to the API description filename or alias that you want to generate the map for.                                 |
| --ai-model         | string  | Model passed to the selected AI provider (provider-specific default applies).                                                      |
| --ai-provider      | string  | AI provider used with `--with-ai`.<br />**Possible values:** `openai`, `claude`, `codex`. Default value is `claude`.               |
| --config           | string  | Specify path to the [configuration file](../configuration/index.md).                                                               |
| --format           | string  | Format for the output.<br />**Possible values:** `stylish`, `json`. Default value is `stylish`.                                    |
| --help             | boolean | Show help.                                                                                                                         |
| --lint-config      | string  | Specify the severity level for the configuration file. <br/> **Possible values:** `warn`, `error`, `off`. Default value is `warn`. |
| --pointer          | string  | Print the content at the given JSON pointer instead of the map. YAML by default; JSON with `--format=json`.                        |
| --source-locations | boolean | Include the original source file, pointer, and line/column range for each node. Useful for multi-file descriptions.                |
| --version          | boolean | Show version number.                                                                                                               |
| --with-ai          | boolean | Refine node summaries with an AI provider. See [AI providers](#ai-providers).                                                      |

## Examples

### Map an OpenAPI description (stylish, default format)

The default output format prints an indented tree, one node per line, with the node title, kind, and pointer:

```
Redocly Cafe Root #/
  Redocly Cafe Info #/info
  paths Paths #/paths
    /menu PathItem #/paths/~1menu
      listMenuItems Operation #/paths/~1menu/get
      createMenuItem Operation #/paths/~1menu/post
  components Components #/components
    schemas NamedSchemas #/components/schemas
      MenuItem Schema #/components/schemas/MenuItem
```

### Map an AsyncAPI description

AsyncAPI descriptions map to their own structure: channels, operations (AsyncAPI 3), and message components:

```
Account Service Root #/
  Account Service Info #/info
  channels NamedChannels #/channels
    userSignedup Channel #/channels/userSignedup
  components Components #/components
    messages NamedMessages #/components/messages
      UserSignedUp Message #/components/messages/UserSignedUp
  operations NamedOperations #/operations
    sendUserSignedup Operation #/operations/sendUserSignedup
```

### Generate a machine-readable map

Use `--format=json` to get the map as a JSON tree, suitable for further processing:

```bash
redocly map openapi.yaml --format=json
```

```json
{
  "title": "Redocly Cafe",
  "kind": "Root",
  "pointer": "#/",
  "nodes": [
    {
      "title": "listMenuItems",
      "kind": "Operation",
      "pointer": "#/paths/~1menu/get",
      "summary": "List all menu items",
      "method": "get",
      "path": "/menu",
      "nodes": []
    }
  ]
}
```

### Include source locations

For descriptions split across multiple files with `$ref`s,
use `--source-locations` to add the original file and pointer to every node:

```bash
redocly map openapi.yaml --format=json --source-locations
```

```json
{
  "title": "/menu",
  "kind": "PathItem",
  "pointer": "#/paths/~1menu",
  "source": {
    "file": "paths/menu.yaml",
    "pointer": "#/",
    "startLine": 1,
    "startCol": 1,
    "endLine": 3,
    "endCol": 24
  },
  "nodes": []
}
```

The `pointer` stays canonical to the logical document,
while `source` tells you exactly where the node lives —
so any tool that can read a file range can retrieve the node's content.
Column boundaries make the location universal across formats:
for a JSON description on a single line, the columns give the exact span of each node.

## AI providers

By default the map is fully deterministic.
With `--with-ai`, node summaries that are missing or mechanically derived are refined by an AI provider:

```bash
redocly map openapi.yaml --with-ai --ai-provider=claude
```

The provider receives the map and the API description,
and returns improved summaries for individual nodes; the tree structure is never changed by the provider.
`openai` calls an OpenAI-compatible endpoint configured with `OPENAI_ENDPOINT` and `OPENAI_API_KEY`;
`claude` and `codex` run the respective CLI, which must be installed and authenticated.
If refinement fails for any reason, the command falls back to the deterministic map.

Currently available AI models for Claude are: `claude-fable-5`, `claude-opus-4-8`, `claude-opus-4-7`, `claude-opus-4-6`, `claude-sonnet-5`, `claude-sonnet-4-6`, `claude-haiku-4-5`.

### Retrieve the content of a node

Use `--pointer` with a canonical pointer from the map to print that node's content
instead of the map itself:

```bash
redocly map openapi.yaml --pointer=#/paths/~1menu
```

```yaml
get:
  operationId: listMenuItems
  summary: List all menu items
```

The node itself is resolved (a path item referenced from another file prints that file's content),
and `$ref`s inside the printed content are kept as-is —
follow them with further `--pointer` calls.
Any pointer into the logical document works, including paths deeper than the map's nodes,
for example `--pointer=#/paths/~1menu/get/summary`.
