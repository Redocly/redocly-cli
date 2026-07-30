# `coverage`

The `coverage` command reports the parts of an OpenAPI description that recorded HTTP traffic never exercised.
The command reads a traffic log (or a folder of logs), matches each request/response exchange to a documented operation, and lists the documented properties, union branches, and schemas that nothing reached.

{% admonition type="warning" name="Experimental" %}
This is an experimental feature.
Its behavior, command, flags, and output may change in future releases.

The `coverage` command supports OpenAPI 3.x descriptions only.
{% /admonition %}

The `coverage` command reports:

- documented operations no request reached
- documented properties no request or response carried
- `oneOf` and `anyOf` branches nothing ever matched
- component schemas nothing reached at all

This is the opposite direction from [`drift`](./drift.md).
`drift` judges the traffic against the description and reports what disagrees; it is silent about a description that is never put to the test.
A `drift` run with no findings is only as meaningful as the share of the description the traffic actually covered, and that share is what `coverage` measures.

An entry in the report is not a defect.
It is a claim the traffic does not substantiate: the property may need an account state, a permission, or an endpoint the capture never reached.
Read it as a list of what to exercise next.

## Supported traffic formats

The traffic input can be provided in any of the following formats.
By default the format is detected automatically from the file contents:

- HAR
- Kong
- Nginx JSON
- Apache JSON
- NDJSON

## Usage

```bash
redocly coverage <traffic> --api <api>
redocly coverage <traffic> --api <api> [--traffic-format=<option>]
redocly coverage <traffic> --api <api> [--format=<option>] [--output=<file>]
redocly coverage <traffic> --api <api> [--schema=<name>]
redocly coverage <traffic> --api <api> [--all]
```

## Options

| Option           | Type    | Description                                                                                                                                 |
| ---------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| traffic          | string  | **REQUIRED.** Path to a traffic log file or folder (HAR, Kong, Nginx/Apache JSON, NDJSON).                                                  |
| --api            | string  | **REQUIRED.** OpenAPI description file or folder to measure coverage against.                                                               |
| --traffic-format | string  | Traffic input format.<br/>**Possible values:** `auto`, `har`, `kong`, `nginx-json`, `apache-json`, `ndjson`. Default value is `auto`.       |
| --format         | string  | Output format.<br/>**Possible values:** `stylish`, `json`. Default value is `stylish`.                                                      |
| --match-mode     | string  | How requests are located via the description `servers`.<br/>**Possible values:** `strict-host`, `basepath`. Default value is `strict-host`. |
| --schema         | string  | Report only this component schema, by name.                                                                                                 |
| --all            | boolean | List the operations and schemas nothing reached instead of collapsing them to a count. Default value is `false`.                            |
| --output, -o     | string  | Write the coverage report (in the format selected with `--format`) to this file instead of stdout.                                          |
| --config         | string  | Specify path to the [configuration file](../configuration/index.md).                                                                        |
| --lint-config    | string  | Specify the severity level for the configuration file.<br/>**Possible values:** `warn`, `error`, `off`. Default value is `warn`.            |
| --help           | boolean | Display help.                                                                                                                               |
| --version        | boolean | Display version number.                                                                                                                     |

## Examples

### Measure coverage of a HAR capture

```bash
redocly coverage ./traffic.har --api ./openapi.yaml
```

Output:

```
90/304 operations exercised (30%)
1072/2206 documented properties observed (49%) over 117 of 340 exchange(s)

  Avatar  22/31
    assetUrl
    highestPrice
  NotificationV2  8/8
    data  oneOf branch 2, 3, 4, 5, 6 never matched

Operations nothing reached — 214
    pass --all to list them

Schemas nothing reached — 166
    pass --all to list them
```

Property coverage is measured over the exchanges that carried a body, because those are the only ones a schema describes.
The second figure reports both counts: here 117 of the 340 parsed exchanges had one.

### Investigate a single schema

```bash
redocly coverage ./traffic.har --api ./openapi.yaml --schema Avatar
```

### List every schema nothing reached

```bash
redocly coverage ./traffic.har --api ./openapi.yaml --all
```

### Track coverage over time

The JSON format carries the same figures for a dashboard or a trend check:

```bash
redocly coverage ./traffic.har --api ./openapi.yaml --format json -o ./coverage.json
```

## Union branches

A `oneOf` or `anyOf` branch counts as covered only when a value could actually have been that branch.
Without this, one response marks every alternative as covered and the figure means nothing.

A branch nothing ever matched is worth attention for a second reason: an unexercised union is also an untested one.
If [`drift`](./drift.md) reports that a union matched more than one branch, the branches listed here are where to start.

## Exit codes

| Exit code | Description                          |
| --------- | ------------------------------------ |
| 0         | The report was produced.             |
| 1         | The command failed to run.           |
| 2         | The configuration failed to resolve. |

## Related commands

- [`drift`](./drift.md) judges the same traffic against the description and reports what disagrees.
- [`proxy`](./proxy.md) captures live HTTP traffic into a HAR file that `coverage` can measure.
