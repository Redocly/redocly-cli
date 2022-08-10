# `stats`

## Introduction

The `stats` command provides statistics about the structure of one or more API definition files. Statistics are calculated using the counting logic from the `StatsVisitor` module. The `stats` command can generate statistics for the following metrics:

* `References`
* `External Documents`
* `Schemas`
* `Parameters`
* `Links`
* `Path Items`
* `Operations`
* `Tags`

## Usage

```bash
redocly stats <api>
redocly stats <api> [--format] [--config=<path>]
redocly stats --version
```

## Options

Option | Type | Description
-- | -- | --
api | string | **REQUIRED.** Path to the API definition file that you want to split into a multi-file structure.
--config | string | Specify path to the [configuration file](#custom-configuration-file).
--format | string | Format for the output.<br />**Possible values:** `stylish`, `json`.
--help | boolean | Show help.
--version | boolean | Show version number.

## Examples

### Api

The `stats` command behaves differently depending on how you pass the api to it and whether the [configuration file](#custom-configuration-file) exists.

#### Pass api directly

```bash
redocly stats openapi/openapi.yaml
```

In this case, `stats` will show statistics for the definition that was passed to the command. The configuration file is ignored.

#### Pass api via configuration file

Instead of full paths, you can use API names from the `apis` section of your Redocly configuration file.

```bash Command
redocly stats core@v1
```

```yaml Configuration file
apis:
  core@v1:
    root: ./openapi/definition.json
```

In this case, after resolving the path behind the `core@v1` name (see the `Configuration file` tab), `stats` displays statistics for the `definition.json` file. The presence of the Redocly configuration file is mandatory.


### Custom configuration file

By default, the CLI tool looks for the [Redocly configuration file](/docs/cli/configuration/index.mdx) in the current working directory. Use the optional `--config` argument to provide an alternative path to a configuration file.

```bash
redocly stats --config=./another/directory/config.yaml
```

### Format

#### Stylish (default)

```bash Request
redocly stats pet.yaml
```

```bash Output
Document: pet.yaml stats:

🚗 References: 3
📦 External Documents: 0
📈 Schemas: 3
👉 Parameters: 2
🔗 Links: 0
➡️ Path Items: 2
👷 Operations: 3
🔖 Tags: 1

pet.yaml: stats processed in 6ms
```

In this format, `stats` shows the statistics for the metrics mentioned in the [Introduction section](#introduction) in condensed output with colored text and an icon at the beginning of each line.

#### JSON

```bash Command
redocly stats pet.yaml --format=json
```

```bash Output
Document: pet.yaml stats:

{
  "refs": {
    "metric": "🚗 References",
    "total": 3
  },
  "externalDocs": {
    "metric": "📦 External Documents",
    "total": 0
  },
  "schemas": {
    "metric": "📈 Schemas",
    "total": 3
  },
  "parameters": {
    "metric": "👉 Parameters",
    "total": 2
  },
  "links": {
    "metric": "🔗 Links",
    "total": 0
  },
  "pathItems": {
    "metric": "➡️ Path Items",
    "total": 2
  },
  "operations": {
    "metric": "👷 Operations",
    "total": 3
  },
  "tags": {
    "metric": "🔖 Tags",
    "total": 1
  }
}
pet.yaml: stats processed in 6ms
```

In this format, `stats` shows the statistics for the metrics mentioned in the [Introduction section](#introduction) in JSON-like output.
