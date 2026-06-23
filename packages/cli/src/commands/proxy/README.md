# proxy (experimental)

Capture **live HTTP traffic** through a reverse proxy into a **HAR file**, and
optionally validate it against an **OpenAPI description** in real time.

> Experimental: the command, flags, and output are subject to change.

The `proxy` command:

- Starts a reverse proxy that forwards every request to an upstream `--target` and records each request/response exchange into a HAR file.
- The HAR file is written incrementally (after each exchange) and flushed on shutdown.
  The file stays durable if the process is interrupted.
- When `--api` is provided, each captured exchange is validated live against the spec using the same engine as [`drift`](../drift/README.md).
  Findings are printed as they happen and a full report is rendered on shutdown.
- The resulting HAR file can be replayed through `drift` later: `redocly drift ./capture.har --api ./openapi.yaml`.

The `proxy` command reuses `@redocly/openapi-core` for spec loading and the bundled `@redocly/ajv` for schema validation, plus `undici` (already shipped) for the upstream client.
There are no additional runtime dependencies.

## Usage

Capture only (no validation):

```bash
redocly proxy --target https://api.example.com --har ./capture.har
# point your client at http://127.0.0.1:4040, then press Ctrl+C to stop
```

Capture and validate live against a spec:

```bash
redocly proxy --target https://api.example.com --har ./capture.har --api ./openapi.yaml
```

Replay a captured HAR through `drift`:

```bash
redocly drift ./capture.har --api ./openapi.yaml
```

## Options

- `--target <url>` (required): upstream base URL to forward captured requests to.
- `--har <path>` (required): HAR file where captured traffic is written.
- `--port <number>` (default: `4040`): port the proxy listens on (`0` picks a free port).
- `--host <string>` (default: `127.0.0.1`): host the proxy binds to.
- `--api <path>`: OpenAPI file or folder to validate captured traffic against.
- `--format <pretty|json|csv|sarif>` (default: `pretty`): final report format.
- `--match-mode <strict-host|basepath>` (default: `strict-host`)
- `--ignore-cookies`: skip cookie-based checks.
- `--max-findings <number>`: max findings shown in pretty output (default: `10`).
- `--rules <csv>`: subset of builtin rules
  (`undocumented-endpoint`, `schema-consistency`, `security-baseline`, `owasp-api-top10`).
- `--plugin <path>`: external rule plugin module (repeatable).

## Exit codes

- `0`: no error-level findings (or capture-only mode).
- `1`: error-level drift detected in captured traffic.

## Notes / PoC limitations

- Reverse proxy only: clients must target the proxy directly.
  There is no forward/`CONNECT` mode and no inbound TLS termination.
- `accept-encoding` is stripped from forwarded requests so captured bodies are stored decoded.
  Binary response bodies are stored base64-encoded in the HAR.
- Captured exchanges are held in memory and the HAR is rewritten in full on each
  exchange.
  This strategy suits development-rate traffic rather than high-volume capture.
