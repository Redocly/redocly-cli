# coverage (experimental)

Report the parts of an OpenAPI description that recorded HTTP traffic never exercised.

> Experimental: the command, flags, and output are subject to change.

The `coverage` command:

- Reads traffic logs (HAR, Kong, Nginx/Apache JSON, NDJSON) through the `drift` parsers.
- Matches each request/response exchange to a documented operation through the `drift` matcher.
- Walks each body against the schema that describes it and records what the value reached.
- Reports what nothing reached:
  - documented operations no request reached
  - documented properties no request or response carried
  - `oneOf`/`anyOf` branches nothing ever matched
  - component schemas nothing reached at all

Body schema selection reuses `drift`'s `pickSchemaByMime` and its status-class fallback (exact status, then `2XX`, then `default`), so the two commands agree on which schema describes a given exchange.

The `coverage` command has **no extra runtime dependencies**: spec loading reuses `@redocly/openapi-core`, and the traffic parsing, spec loading, and operation matching are shared with `drift`.

## Relationship to `drift`

`drift` judges traffic against the description and reports what disagrees. It cannot report on a description that was never put to the test, so a clean `drift` run means only that nothing was wrong *in the part the traffic covered*. `coverage` measures that part.

## Why this is a command and not a `drift` rule

A `TrafficRule` is invoked once per exchange, has no finalize hook, and receives only the matched operation through `RuleContext`. Coverage is a whole-run measurement compared against the whole description, so neither constraint fits.

## Why the description is loaded twice

`drift`'s `loadOpenApiIndex` bundles with `dereference: true`, which deep-clones every `$ref` target. Nothing under `paths` then shares object identity with `components.schemas`, so a value's schema cannot be traced back to the component it came from — and coverage is reported per component.

`coverage` therefore bundles a second time with `dereference: false`, uses `drift`'s index purely to match an exchange to an operation, and looks that operation up in the referenced document by method and path template. The alternative — stamping a name onto each node during dereferencing — would mean changing a loader four rules already depend on.

## Layout

| Path                | Role                                                     |
| ------------------- | -------------------------------------------------------- |
| `index.ts`          | Command handler: load, match, walk.                      |
| `engine/schema.ts`  | `$ref` resolution, declared properties, branch matching. |
| `engine/sites.ts`   | Static enumeration of every union site per schema.       |
| `engine/walk.ts`    | Walking a value against its schema.                      |
| `engine/analyse.ts` | Turning what was reached into what was not.              |
| `reporter.ts`       | `stylish` and `json` output.                             |

## Usage

```bash
redocly coverage <traffic> --api <api>
redocly coverage ./traffic.har --api ./openapi.yaml --schema Avatar
redocly coverage ./traffic.har --api ./openapi.yaml --format json -o ./coverage.json
```

See `docs/@v2/commands/coverage.md` for the full option reference.
