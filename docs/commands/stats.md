# `stats`

The `stats` command provides statistics about the structure of one or more API definition files. Statistics are calculated using the counting logic from the `StatsVisitor` module. The `stats` command can generate statistics for the following:


```shell
Metrics:
    References,
    External Documents,
    Schemas,
    Parameters,
    Links,
    Path Items,
    Operations,
    Tags
```


### `stats` usage


```shell
Positionals:
  entrypoint                                                 [string] [required]
Options:
  --version            Show version number.                            [boolean]
  --help               Show help.                                      [boolean]
  --format             Use a specific output format.
                               [choices: "stylish", "json"] [default: "stylish"]
  --config             Specify path to the config file.                 [string]
```


The command:


```bash
openapi stats openapi/petstore.yaml
```


The output will be:


```shell
🚗 References: 12
📦 External Documents: 3
📈 Schemas: 10
👉 Parameters: 9
🔗 Links: 0
➡️ Path Items: 16
👷 Operations: 22
🔖 Tags: 5
```


### Options

#### Format

The `stats` command supports two output formats: `stylish` and `json`. Choose which format to use with the optional `--format` argument.

The default format is `stylish`, with colored text and an icon at the beginning of each line.


**Example JSON output**


```bash
openapi stats test.yaml --format=json
```


```json
Document: test.yaml stats:

  {
    "refs": {
        "metric": "🚗 References",
        "total": 1
    },
    "externalDocs": {
        "metric": "📦 External Documents",
        "total": 0
    },
    "schemas": {
        "metric": "📈 Schemas",
        "total": 1
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
        "total": 3
    },
    "operations": {
        "metric": "👷 Operations",
        "total": 3
    },
    "tags": {
        "metric": "🔖 Tags",
        "total": 2
    }
  }
```



#### Specify config file

By default, the CLI tool looks for a `.redocly.yaml` configuration file in the current working directory. Use the optional `--config` argument to provide an alternative path to a configuration file.


```bash
openapi stats openapi/petstore.yaml --config openapi/.redocly.yaml
```
