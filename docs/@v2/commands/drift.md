# `drift`

The `drift` command detects drift between recorded HTTP traffic and an OpenAPI description.
The command reads a traffic log (or a folder of logs), matches each request/response exchange to a documented operation, and reports the discrepancies it finds.

{% admonition type="warning" name="Experimental" %}
This is an experimental feature.
Its behavior, command, flags, and output may change in future releases.

The `drift` command supports OpenAPI 3.x descriptions only.
{% /admonition %}

The `drift` command reports:

- undocumented endpoints
- undocumented request parameters and headers
- missing required parameters or request bodies
- request and response schema mismatches
- baseline security issues (opt-in OWASP API risk heuristics)

Spec loading reuses the same engine as the other commands (`@redocly/openapi-core`), and schema validation reuses the bundled `@redocly/ajv`, so there are no extra runtime dependencies.

## Supported traffic formats

The traffic input can be provided in any of the following formats.
By default the format is detected automatically from the file contents:

- HAR
- Kong
- Nginx JSON
- Apache JSON
- NDJSON

JSON-array traffic files (HAR, Kong, and webserver JSON) are read fully into memory.
For very large captures, prefer the NDJSON format, which is streamed.

## Usage

```bash
redocly drift <traffic> --api <api>
redocly drift <traffic> --api <api> [--traffic-format=<option>]
redocly drift <traffic> --api <api> [--format=<option>] [--output=<file>]
redocly drift <traffic> --api <api> [--server=<url>]
redocly drift <traffic> --api <api> [--match-mode=<option>]
```

## Options

| Option           | Type    | Description                                                                                                                                                                                                                                                                       |
| ---------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| traffic          | string  | **REQUIRED.** Path to a traffic log file or folder (HAR, Kong, Nginx/Apache JSON, NDJSON).                                                                                                                                                                                        |
| --api            | string  | **REQUIRED.** OpenAPI description file or folder to validate against.                                                                                                                                                                                                             |
| --traffic-format | string  | Traffic input format.<br/>**Possible values:** `auto`, `har`, `kong`, `nginx-json`, `apache-json`, `ndjson`. Default value is `auto`.                                                                                                                                             |
| --format         | string  | Output format.<br/>**Possible values:** `pretty`, `json`, `csv`, `sarif`. Default value is `pretty`.                                                                                                                                                                              |
| --match-mode     | string  | How requests are located via the description `servers`. `strict-host` also requires the host to match; `basepath` matches only the base path.<br/>**Possible values:** `strict-host`, `basepath`. Default value is `strict-host`. Mutually exclusive with `--server`.             |
| --server         | string  | Server URL the traffic was captured against (host, host + base path, or a path-only prefix like `/api`). Only requests under it are considered, and the rest of their URL is treated as the API path. Replaces the description `servers`. Mutually exclusive with `--match-mode`. |
| --ignore-cookies | boolean | Ignore cookie-based checks (useful for logs exported without cookies). Default value is `false`.                                                                                                                                                                                  |
| --max-findings   | number  | Maximum findings shown in pretty output. Default value is `10`.                                                                                                                                                                                                                   |
| --min-severity   | string  | Discard findings below this severity from the report (all formats).<br/>**Possible values:** `info`, `warning`, `error`. Default value is `info`.                                                                                                                                 |
| --rules          | string  | Comma-separated subset of builtin rules to run: `undocumented-endpoint`, `schema-consistency`, `security-baseline`, `owasp-api-top10`.                                                                                                                                            |
| --output, -o     | string  | Write the drift report (in the format selected with `--format`) to this file instead of stdout.                                                                                                                                                                                   |
| --config         | string  | Specify path to the [configuration file](../configuration/index.md).                                                                                                                                                                                                              |
| --lint-config    | string  | Specify the severity level for the configuration file.<br/>**Possible values:** `warn`, `error`, `off`. Default value is `warn`.                                                                                                                                                  |
| --help           | boolean | Display help.                                                                                                                                                                                                                                                                     |
| --version        | boolean | Display version number.                                                                                                                                                                                                                                                           |

The `owasp-api-top10` rule is opt-in and only runs when included in `--rules`.

## Examples

### Validate a HAR capture against a single description

```bash
redocly drift ./traffic.har --api ./openapi.yaml
```

### Validate a folder of logs against a folder of descriptions

```bash
redocly drift ./traffic-logs/ --api ./openapi/ --format json
```

### Declare the server the traffic was captured against

When the captured traffic does not carry the documented host or base path (for example, behind a gateway that adds `/api`), use `--server` to declare the actual server.
Only requests under it are considered, and the remaining path is matched against the description paths directly:

```bash
redocly drift ./traffic.har --api ./openapi.yaml --server localhost:9000
```

### Write the report to a file

```bash
redocly drift ./traffic.har --api ./openapi.yaml --format json -o ./drift-report.json
```

## Exit codes

- `0`: no error-level findings.
- `1`: error-level drift detected.

## Related commands

- [`proxy`](./proxy.md) captures live HTTP traffic into a HAR file that can be replayed through `drift`.
