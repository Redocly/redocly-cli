# drift (experimental)

Detect drift between **recorded HTTP traffic** and an **OpenAPI description** — or
generate a description from traffic when none is provided.

> Experimental: the command, flags, and output are subject to change.

## What it does

- Streams traffic logs (HAR, Kong, Nginx/Apache JSON, NDJSON).
- Matches each request/response exchange to a documented operation.
- Reports discrepancies:
  - undocumented endpoints,
  - undocumented request params/headers,
  - missing required parameters/body,
  - request/response schema mismatches,
  - baseline security issues (opt-in OWASP API risk heuristics).
- When no spec is provided, infers an OpenAPI 3.1 description from the traffic.

It has **no extra runtime dependencies** beyond what `@redocly/cli` already ships:
spec loading reuses `@redocly/openapi-core` and schema validation reuses the bundled
`@redocly/ajv`.

## Usage

Validate traffic against a spec (file or folder):

```bash
redocly drift ./traffic.har --api ./openapi.yaml
redocly drift ./traffic-logs/ --api ./openapi/ --format json
redocly drift ./traffic.har --api ./openapi/ --server localhost:9000
redocly drift ./traffic.har --api ./openapi.yaml --format json -o ./drift-report.json
```

Generate a description from traffic (omit `--api`):

```bash
redocly drift ./traffic.har                  # prints YAML to stdout
redocly drift ./traffic.har -o ./generated.yaml
redocly drift ./traffic.har --server https://api.example.com/v1
```

## Options

- `--api <path>`: OpenAPI file or folder to validate against. Omit to generate.
- `--traffic-format <auto|har|kong|nginx-json|apache-json|ndjson>` (default: `auto`)
- `--format <pretty|json|csv|sarif>` (default: `pretty`)
- `--match-mode <strict-host|basepath>` (default: `strict-host`): how requests are located
  via the description `servers` (`strict-host` also requires the host to match, `basepath`
  only the base path). Mutually exclusive with `--server`.
- `--ignore-cookies`: skip cookie-based checks (logs exported without cookies)
- `--max-findings <number>`: max findings shown in pretty output (default: `10`)
- `--min-severity <info|warning|error>` (default: `info`): discard findings below this
  severity from the report (all formats); e.g. `--min-severity error` reports errors only
- `--rules <csv>`: subset of builtin rules
  (`undocumented-endpoint`, `schema-consistency`, `security-baseline`, `owasp-api-top10`)
- `--plugin <path>`: external rule plugin module (repeatable)
- `--traffic-plugin <path>`: external traffic parser module (repeatable)
- `--output, -o <path>`: write the result to a file instead of stdout - the drift report
  (in the format selected with `--format`) when validating with `--api`, the generated
  description otherwise
- `--server <url>`: server URL the traffic was captured against (host, host + base path,
  or a path-only prefix like `/api`). Only requests under it are considered, and the rest
  of their URL is treated as the API path. When validating with `--api`, it replaces the
  description `servers` and the remainder is matched against the description paths
  directly - useful when the captured traffic does not carry the documented host or base
  path (e.g. `--server localhost:9000` for traffic captured behind a gateway that adds
  `/api`). When generating, it becomes the `servers` URL of the generated description
  (without it, all hosts are merged and every observed origin is listed under `servers`).
  Mutually exclusive with `--match-mode`: use `--match-mode` when the traffic URLs align
  with the description `servers`, use `--server` to declare the actual server when they
  do not.

## Exit codes

- `0`: no error-level findings (or generation succeeded)
- `1`: error-level drift detected

## Notes / PoC limitations

- JSON-array traffic files (HAR/Kong/webserver-json) are read fully into memory.
  For very large captures, prefer the NDJSON format.
- Spec generation infers schemas from observed samples (path templating, required
  fields = intersection across samples) and is intentionally rough.
- Builtin `owasp-api-top10` is opt-in via `--rules owasp-api-top10`.
