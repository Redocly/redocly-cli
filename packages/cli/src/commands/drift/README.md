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
- `--coverage`: print an API coverage overview after the report: how many documented operations, parameters,
  JSON schema properties, and response codes the traffic exercised
- `--coverage-output <path>`: write a detailed JSON coverage report that lists the covered and missing items of every operation
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

Coverage does not affect the exit code.

## Coverage

`--coverage` and `--coverage-output` measure how much of the description the traffic exercised.
The collector (`engine/coverage-collector.ts`) is fed by `ValidationSession` with every exchange and its matched operation.
Every documented item is an entry that is either covered or missing:

- `operation`: matched by at least one exchange
- `parameter`: a matched exchange carried it (cookie parameters are skipped with `--ignore-cookies`)
- `property`: a matched exchange carried it in a JSON request or response body;
  collected from `properties`, `items`, `allOf`, `oneOf`, and `anyOf`, skipping `readOnly` properties on the request side and `writeOnly` on the response side.
  For `oneOf` / `anyOf`, only the branches the value satisfies are entered.
- `response`: a matched exchange resolved to that documented status (exact, then `2XX`, then `default`, like `schema-consistency`)

## Notes / PoC limitations

- JSON-array traffic files (HAR/Kong/webserver-json) are read fully into memory.
  For very large captures, prefer the NDJSON format.
- Builtin `owasp-api-top10` is opt-in via `--rules owasp-api-top10`.
- Builtin `security-baseline` does not report insecure-transport findings for loopback hosts (`localhost`, `*.localhost`, `127.0.0.0/8`, `[::1]`).
  Sandboxed captures, for example, recorded with `redocly proxy` against a local target during e2e runs, stay warning-free.
- Builtin `schema-consistency` skips request-side checks (required parameters, required body, request-body schema) when the response is a `4xx` client error.
  The server rejected the request, so validating it against the operation's success-path contract would report the server's own correct rejection as drift.
- Builtin `schema-consistency` understands `deepObject`-style query parameters: traffic keys like `name[property]=value` are matched to the documented parameter and validated against its object schema instead of being reported as undocumented.
