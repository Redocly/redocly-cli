# `proxy`

The `proxy` command captures live HTTP traffic through a reverse proxy into a HAR file, and optionally validates it against an OpenAPI description in real time.

{% admonition type="warning" name="Experimental" %}
This is an experimental feature.
Its behavior, command, flags, and output may change in future releases.

The `proxy` command supports OpenAPI 3.x descriptions only.
{% /admonition %}

The `proxy` command:

- Starts a reverse proxy that forwards every request to an upstream `--target` and records each request/response exchange into a HAR file.
- Appends each exchange to a temporary file on disk as it is captured (nothing is held in memory), then assembles the final HAR document on shutdown.
- When `--api` is provided, validates each captured exchange live against the description using the same engine as [`drift`](./drift.md); findings are printed as they happen and a full report is rendered on shutdown.

The resulting HAR file can be replayed through `drift` later.

Spec loading reuses `@redocly/openapi-core`, schema validation reuses the bundled `@redocly/ajv`, and the upstream client uses `undici` (already shipped), so there are no extra runtime dependencies.

Clients must target the proxy directly; there is no forward/`CONNECT` mode and no inbound TLS termination.
The `accept-encoding` header is stripped from forwarded requests so captured bodies are stored decoded; binary response bodies are stored base64-encoded in the HAR.

Captured exchanges are streamed to a temporary file (`<har>.entries.tmp`) and assembled into the final HAR only on shutdown.
If the process is terminated before shutdown, the temporary file remains but the final HAR is not written.

## Usage

```bash
redocly proxy --target <url> --har <path>
redocly proxy --target <url> --har <path> --api <api>
redocly proxy --target <url> --har <path> [--port=<number>] [--host=<string>]
```

## Options

| Option           | Type    | Description                                                                                                                                        |
| ---------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| --target         | string  | **REQUIRED.** Upstream base URL to forward captured requests to.                                                                                   |
| --har            | string  | **REQUIRED.** Path to the HAR file where captured traffic is written.                                                                              |
| --port           | number  | Port the proxy listens on (`0` picks a free port). Default value is `4040`.                                                                        |
| --host           | string  | Host the proxy binds to. Default value is `127.0.0.1`.                                                                                             |
| --api            | string  | OpenAPI description file or folder to validate captured traffic against (live).                                                                    |
| --format         | string  | Output format for the validation report printed on shutdown.<br/>**Possible values:** `pretty`, `json`, `csv`, `sarif`. Default value is `pretty`. |
| --match-mode     | string  | Endpoint matching mode.<br/>**Possible values:** `strict-host`, `basepath`. Default value is `strict-host`.                                        |
| --ignore-cookies | boolean | Ignore cookie-based checks. Default value is `false`.                                                                                              |
| --max-findings   | number  | Maximum findings shown in pretty output. Default value is `10`.                                                                                    |
| --rules          | string  | Comma-separated subset of built-in rules to run: `undocumented-endpoint`, `schema-consistency`, `security-baseline`, `owasp-api-top10`.            |
| --plugin         | string  | Path to an external rule plugin module. Repeatable.                                                                                                |
| --config         | string  | Specify the path to the [configuration file](../configuration/index.md).                                                                           |
| --lint-config    | string  | Specify the severity level for the configuration file.<br/>**Possible values:** `warn`, `error`, `off`. Default value is `warn`.                   |
| --help           | boolean | Display help.                                                                                                                                      |
| --version        | boolean | Display version number.                                                                                                                            |

## Examples

### Capture only (no validation)

```bash
redocly proxy --target https://api.example.com --har ./capture.har
# point your client at http://127.0.0.1:4040, then press Ctrl+C to stop
```

### Capture and validate live against a description

```bash
redocly proxy --target https://api.example.com --har ./capture.har --api ./openapi.yaml
```

### Replay a captured HAR through `drift`

```bash
redocly drift ./capture.har --api ./openapi.yaml
```

## Exit codes

- `0`: no error-level findings (or capture-only mode).
- `1`: error-level drift detected in captured traffic.

## Related commands

- [`drift`](./drift.md) replays a recorded HAR (or other traffic log) against an OpenAPI description.
