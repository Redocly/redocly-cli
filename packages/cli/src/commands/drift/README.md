# drift (experimental)

Detect drift between recorded HTTP traffic and an OpenAPI description file.

> Experimental: the command, flags, and output are subject to change.

The `drift` command:

- Streams traffic logs (HAR, Kong, Nginx/Apache JSON, NDJSON).
- Matches each request/response exchange to a documented operation.
- Reports discrepancies:
  - undocumented endpoints
  - undocumented request params/headers
  - missing required parameters/body
  - request/response schema mismatches
  - baseline security issues (opt-in OWASP API risk heuristics)

The `drift` command has **no extra runtime dependencies** beyond what `@redocly/cli` already ships: spec loading reuses `@redocly/openapi-core` and schema validation reuses the bundled `@redocly/ajv`.

## Usage

Validate traffic against a spec (file or folder):

```bash
redocly drift ./traffic.har --api ./openapi.yaml
redocly drift ./traffic-logs/ --api ./openapi/ --format json
redocly drift ./traffic.har --api ./openapi/ --server localhost:9000
redocly drift ./traffic.har --api ./openapi.yaml --format json -o ./drift-report.json
```

## Options

- `--api <path>`: OpenAPI file or folder to validate against (required).
- `--traffic-format <auto|har|kong|nginx-json|apache-json|ndjson>` (default: `auto`)
- `--format <pretty|json|csv|sarif>` (default: `pretty`)
- `--match-mode <strict-host|basepath>` (default: `strict-host`): how requests are located using the description's `servers` (`strict-host` also requires the host to match, `basepath`
  only the base path). Mutually exclusive with `--server`.
- `--ignore-cookies`: skip cookie-based checks (logs exported without cookies)
- `--max-findings <number>`: max findings shown in pretty output (default: `10`)
- `--min-severity <info|warning|error>` (default: `info`): discard findings below this
  severity from the report (all formats); e.g. `--min-severity error` reports errors only
- `--rules <csv>`: subset of builtin rules
  (`undocumented-endpoint`, `schema-consistency`, `security-baseline`, `owasp-api-top10`)
- `--output, -o <path>`: write the drift report (in the format selected with `--format`) to a file instead of stdout
- `--server <url>`: server URL the traffic was captured against (host, host + base path, or a path-only prefix like `/api`).
  Only requests under it are considered, and the rest of their URL is treated as the API path.
  `--server` replaces the description's `servers` and the remainder is matched against the description paths directly.
  Useful when the captured traffic does not carry the documented host or base path (e.g. `--server localhost:9000` for traffic captured behind a gateway that adds `/api`).
  Mutually exclusive with `--match-mode`.
  Use `--match-mode` when the traffic URLs align with the description
  `servers`.
  Use to declare the actual server when they do not.

## Exit codes

- `0`: no error-level findings
- `1`: error-level drift detected

## Notes / PoC limitations

- JSON-array traffic files (HAR/Kong/webserver-json) are read fully into memory.
  For very large captures, prefer the NDJSON format.
- Builtin `owasp-api-top10` is opt-in via `--rules owasp-api-top10`.
