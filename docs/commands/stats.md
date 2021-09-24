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
openapi stats <entrypoint>
openapi stats <entrypoint> [--format] [--config=<path>]
openapi stats --version
```

## Options

Option                    | Type      | Required     | Default     | Description
--------------------------|:---------:|:------------:|:-----------:|------------
`entrypoint`              | `string`  | yes          | -           | Path to the API definition filename that you want to calculate statistics for. Instead of full paths, you can use aliases assigned in the `apiDefinitions` section within your `.redocly.yaml` configuration file as entrypoints. Refer to [the entrypoint section below](#entrypoint) for more options.
`--config`                | `string`  | no           | -           | Specify path to the [config file](#custom-configuration-file)
`--format`                | `string`  | no           | `stylish`   | Format for the output.<br />**Possible values:** `stylish`, `json`
`--help`                  | `boolean` | no           | -           | Show help
`--version`               | `boolean` | no           | -           | Show version number

## Examples

### Entrypoint

The `stats` command behaves differently depending on how you pass entrypoint to it and whether the [configuration file](#custom-configuration-file) exists. There are the following options:

#### Pass entrypoint directly

```bash
openapi stats openapi/openapi.yaml
```

In this case, `stats` will show statistics for the definition that was passed to the command. The configuration file is ignored.

#### Pass entrypoints via configuration file

Instead of full paths, you can use aliases assigned in your `apiDefinitions` within your `.redocly.yaml` configuration file as entrypoints. For example, `petstore`:

```bash command
openapi stats petstore
```

```yaml .redocly.yaml
apiDefinitions:
  petstore: ./openapi/petstore-definition.json
```

In this case, after resolving the path behind the `petstore` alias (see the `.redocly.yaml` tab), `stats` will show statistics for the `petstore.json` definition file. The presence of the `.redocly.yaml` configuration file is mandatory.

### Custom configuration file

By default, the CLI tool looks for a `.redocly.yaml` configuration file in the current working directory. Use the optional `--config` argument to provide an alternative path to a configuration file. 

```bash
openapi stats --config=./another/directory/config.yaml
```

### Format

#### Stylish (default)

```bash request
openapi stats pet.yaml
```

```bash output
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

```bash request
openapi stats pet.yaml --format=json
```

```bash output
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
