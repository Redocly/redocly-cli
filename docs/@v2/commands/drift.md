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
redocly drift <traffic> --api <api> [--coverage] [--coverage-output=<file>]
```

## Options

| Option            | Type    | Description                                                                                                                                                                                                                                                                       |
| ----------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| traffic           | string  | **REQUIRED.** Path to a traffic log file or folder (HAR, Kong, Nginx/Apache JSON, NDJSON).                                                                                                                                                                                        |
| --api             | string  | **REQUIRED.** OpenAPI description file or folder to validate against.                                                                                                                                                                                                             |
| --traffic-format  | string  | Traffic input format.<br/>**Possible values:** `auto`, `har`, `kong`, `nginx-json`, `apache-json`, `ndjson`. Default: `auto`.                                                                                                                                             |
| --format          | string  | Output format.<br/>**Possible values:** `pretty`, `json`, `csv`, `sarif`. Default: `pretty`.                                                                                                                                                                              |
| --match-mode      | string  | How requests are located via the description `servers`. `strict-host` also requires the host to match; `basepath` matches only the base path.<br/>**Possible values:** `strict-host`, `basepath`. Default: `strict-host`. Mutually exclusive with `--server`.             |
| --server          | string  | Server URL the traffic was captured against (host, host + base path, or a path-only prefix like `/api`). Only requests under it are considered, and the rest of their URL is treated as the API path. Replaces the description `servers`. Mutually exclusive with `--match-mode`. |
| --ignore-cookies  | boolean | Ignore cookie-based checks (useful for logs exported without cookies). Default: `false`.                                                                                                                                                                                  |
| --ignore-headers  | string  | Comma-separated header names to skip in undocumented-header checks. A trailing `*` matches by prefix, for example `x-consumer-*`. Useful for headers a gateway or proxy adds that are not part of the API contract.                                                               |
| --max-findings    | number  | Maximum findings shown in pretty output. Default: `10`.                                                                                                                                                                                                                   |
| --min-severity    | string  | Discard findings below this severity from the report (all formats).<br/>**Possible values:** `info`, `warning`, `error`. Default: `info`.                                                                                                                                 |
| --rules           | string  | Comma-separated subset of builtin rules to run: `undocumented-endpoint`, `schema-consistency`, `security-baseline`, `owasp-api-top10`.                                                                                                                                            |
| --output, -o      | string  | Write the drift report (in the format selected with `--format`) to this file instead of stdout.                                                                                                                                                                                   |
| --coverage        | boolean | Print an [API coverage](#api-coverage) overview after the report: how many documented operations, parameters, schema properties, and response codes the traffic exercised. Default: false`.                                                                              |
| --coverage-output | string  | Write a detailed JSON [API coverage](#api-coverage) report to this file. Lists the covered and missing items of every operation.                                                                                                                                                  |
| --config          | string  | Specify path to the [configuration file](../configuration/index.md).                                                                                                                                                                                                              |
| --lint-config     | string  | Specify the severity level for the configuration file.<br/>**Possible values:** `warn`, `error`, `off`. Default: `warn`.                                                                                                                                                  |
| --help            | boolean | Display help.                                                                                                                                                                                                                                                                     |
| --version         | boolean | Display version number.                                                                                                                                                                                                                                                           |

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

### Ignore headers added by a gateway or proxy

A gateway such as Caddy often injects headers that are not part of the API contract (for example authentication or consumer-identity headers).
Skip them so they don't show up as undocumented headers.
Use a trailing `*` to match a family of headers by prefix:

```bash
redocly drift ./traffic.har --api ./openapi.yaml --ignore-headers "x-caddy-auth-token,x-auth-intent,x-consumer-*"
```

### Write the report to a file

```bash
redocly drift ./traffic.har --api ./openapi.yaml --format json -o ./drift-report.json
```

### Measure API coverage

```bash
redocly drift ./traffic.har --api ./openapi.yaml --coverage --coverage-output ./coverage.json
```

## API coverage

Drift tells you where the traffic disagrees with the description.
Coverage tells you how much of the description the traffic exercised at all, so you know how far the drift findings can be trusted.
Coverage is measured the same way test runners measure code coverage: each documented item is either covered by at least one exchange or missing.

With `--coverage`, the command prints an overview after the drift report:

```bash
API coverage: 46%
  operations         ███████████████░░░░░   75%      3/4
  parameters         ██████████░░░░░░░░░░   50%      2/4
  schema properties  ████████░░░░░░░░░░░░   41%    16/39
  response codes     ███████████░░░░░░░░░   57%      4/7
```

| Category          | Documented items                                                          | Covered when                                                                                     |
| ----------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| operations        | Every operation of the loaded descriptions.                               | At least one exchange matched the operation.                                                     |
| parameters        | Every path, query, header, and cookie parameter of an operation.          | A matched exchange carried the parameter. Cookie parameters are skipped with `--ignore-cookies`. |
| schema properties | Every property reachable from the JSON request and response body schemas. | A matched exchange carried the property in its JSON body.                                        |
| response codes    | Every response of an operation, including responses without content.      | A matched exchange returned the status. Status ranges such as `2XX` and `default` count as well. |

Schema properties are collected from `properties`, `items`, `allOf`, `oneOf`, and `anyOf`.
Properties marked `readOnly` are not expected in requests and properties marked `writeOnly` are not expected in responses, so they are not counted on that side.
For `oneOf` and `anyOf`, a body only covers the properties of the branches it satisfies.
The overall percentage is the covered share of all items across the four categories.

If the report on stdout is machine-readable (`--format json`, `csv`, or `sarif` without `--output`), the overview is printed to stderr so the report stays parseable.

With `--coverage-output`, the command writes a JSON report that lists, for every operation, the items the traffic covered and the items it never exercised:

```json
{
  "version": 1,
  "meta": {
    "spec": "./openapi.yaml",
    "traffic": "./traffic.har",
    "matchMode": "strict-host",
    "exchanges": { "total": 4, "matched": 4, "withBody": 4 }
  },
  "totals": {
    "overall": { "covered": 25, "total": 54 },
    "operations": { "covered": 3, "total": 4 },
    "parameters": { "covered": 2, "total": 4 },
    "properties": { "covered": 16, "total": 39 },
    "responses": { "covered": 4, "total": 7 }
  },
  "operations": [
    {
      "method": "GET",
      "path": "/items",
      "operationId": "listItems",
      "missing": [
        { "kind": "parameter", "name": "limit", "in": "query" },
        { "kind": "property", "target": "response", "status": "200", "path": "[].tags" },
        { "kind": "response", "status": "400" }
      ],
      "covered": [
        { "kind": "operation" },
        { "kind": "parameter", "name": "category", "in": "query" },
        { "kind": "response", "status": "200" },
        { "kind": "property", "target": "response", "status": "200", "path": "[].name" }
      ]
    }
  ]
}
```

- `meta.exchanges.withBody` counts the matched exchanges that carried a JSON request or response body.
- A property `path` is relative to the body: `[]` marks array items, so `[].price.amount` is the `amount` of the `price` of each element.

The coverage output is experimental and its shape may change.
Coverage does not affect the exit code.

## Exit codes

- `0`: no error-level findings.
- `1`: error-level drift detected.

## Related commands

- [`proxy`](./proxy.md) captures live HTTP traffic into a HAR file that can be replayed through `drift`.
- [`generate-spec`](./generate-spec.md) infers an OpenAPI description from the same traffic formats.
