# `score`

## Introduction

The `score` command analyzes an OpenAPI description and produces a composite **Agent Readiness** score (0–100) that measures how easy the API is to integrate and how usable it is by AI agents and LLM-based tooling. Higher is better.

In addition to the top-level score, the command reports normalized subscores, raw metrics for every operation, and a list of **hotspot operations** — the endpoints most likely to cause integration friction — along with human-readable explanations.

{% admonition type="warning" name="Important" %}
The `score` command is considered an experimental feature. This means it's still a work in progress and may go through major changes.

The `score` command supports OpenAPI 3.x descriptions only.
{% /admonition %}

### Metrics

The following raw metrics are collected per operation and aggregated across the document:

| Metric                             | Description                                                                                                                                                                                                         |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Parameter count                    | Total parameters (path, query, header, cookie) per operation.                                                                                                                                                       |
| Required parameter count           | How many of those parameters are required.                                                                                                                                                                          |
| Request body presence              | Whether the operation defines a request body.                                                                                                                                                                       |
| Top-level writable field count     | Number of non-`readOnly` top-level properties in request schemas.                                                                                                                                                   |
| Max request/response schema depth  | Deepest nesting level in request and response schemas.                                                                                                                                                              |
| Polymorphism count                 | Number of `oneOf`, `anyOf`, and `allOf` usages. `anyOf` is penalized more heavily because it allows ambiguous combinations of schemas, making it harder for consumers and AI agents to determine the correct shape. |
| Property count                     | Total schema properties across request and response.                                                                                                                                                                |
| Description coverage               | Fraction of operations, parameters, and schema properties that have descriptions.                                                                                                                                   |
| Ambiguous identifier count         | Parameters with generic names (e.g. `id`, `name`, `type`) and no description.                                                                                                                                       |
| Constraint coverage                | Count of constraining keywords (`enum`, `format`, `pattern`, `minimum`, `maximum`, `minLength`, `maxLength`, `discriminator`, etc.).                                                                                |
| Request/response example coverage  | Whether request and response media types include `example` or `examples`.                                                                                                                                           |
| Structured error response coverage | How many 4xx/5xx responses include a content schema or meaningful description.                                                                                                                                      |
| Security scheme coverage           | Whether operations reference documented security schemes with descriptions.                                                                                                                                         |
| Cross-operation dependency depth   | Inferred from shared `$ref` usage across operations. Operations that share many schemas form a dependency graph; deeper graphs indicate tightly coupled multi-step interactions.                                    |

### Subscores

The following subscores are normalized to 0–1 and combined into the composite Agent Readiness score:

`parameterSimplicity`, `schemaSimplicity`, `documentationQuality`, `constraintClarity`, `exampleCoverage`, `errorClarity`, `dependencyClarity`, `identifierClarity`, `polymorphismClarity`, `discoverability`.

The `discoverability` subscore reflects the total number of operations in the API. Larger APIs (approaching 1,000+ operations) receive a lower discoverability score because finding the right endpoint becomes harder for both humans and AI agents.

### Hotspots

The command identifies the operations with the lowest scores and provides reasons such as:

- "High parameter count (N)"
- "Deep schema nesting (depth M)"
- "Polymorphism (anyOf) without discriminator"
- "Missing request and response examples"
- "No structured error responses (4xx/5xx)"
- "Missing operation description"

### Recommendations

With `--recommendations`, the command ranks the edits that raise the score by their simulated impact.
Each recommendation names one kind of edit, the subscore it moves, the number of places it fixes, and the operations it touches.

| Kind                    | Edit                                                                                        | Subscore               |
| ----------------------- | ------------------------------------------------------------------------------------------- | ---------------------- |
| `operation-description` | Add a description to each operation.                                                        | `documentationQuality` |
| `parameter-description` | Add a description to each parameter. A parameter with a description is no longer ambiguous. | `documentationQuality` |
| `property-description`  | Add a description to each schema property.                                                  | `documentationQuality` |
| `request-example`       | Add an example to each request body.                                                        | `exampleCoverage`      |
| `response-example`      | Add an example to the responses of each operation that declares a response body.            | `exampleCoverage`      |
| `structured-error`      | Add a schema or a description to each 4xx and 5xx response.                                 | `errorClarity`         |
| `constraint`            | Add constraints, such as `enum`, `format`, or `maxLength`, to schema properties.            | `constraintClarity`    |

The impact of a recommendation is the score change from that edit alone, so the impacts don't add up.
The **reachable** score is the score with every safe edit made together.
A constraint is not a safe edit: a constraint that the API doesn't enforce narrows its contract.
Add only the constraints that the API already enforces; the reachable score leaves them out.

The command simulates the edits on the collected metrics and never changes your files.

**Design findings** list the structural problems that no documentation edit fixes, such as a high parameter count, deep schema nesting, polymorphism, or a high dependency depth.
Each finding names the operations it affects.

## Usage

```bash
redocly score <api>
redocly score <api> [--format=<option>] [--recommendations]
```

## Options

| Option               | Type    | Description                                                                                                                                    |
| -------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| api                  | string  | **REQUIRED.** Path to the API description filename or alias that you want to score. Refer to [the API section](#specify-api) for more details. |
| --config             | string  | Specify path to the [configuration file](../configuration/index.md).                                                                           |
| --format             | string  | Format for the output.<br />**Possible values:** `stylish`, `json`. Default value is `stylish`.                                                |
| --operation-details  | boolean | Print a per-operation metrics table sorted by property count.                                                                                  |
| --debug-operation-id | string  | Print a detailed schema breakdown for a specific operation (by `operationId` or `METHOD /path`).                                               |
| --recommendations    | boolean | Rank the edits that raise the score by their simulated impact. Refer to [Recommendations](#recommendations).                                   |
| --help               | boolean | Show help.                                                                                                                                     |
| --lint-config        | string  | Specify the severity level for the configuration file. <br/> **Possible values:** `warn`, `error`, `off`. Default value is `warn`.             |

## Examples

### Specify API

#### Pass an API directly

```bash
redocly score openapi/openapi.yaml
```

### Specify output format

#### Stylish output (default)

The default output format shows a human-readable summary in your terminal.
It ends with a link to this page.

```sh
  Scores

  Agent Readiness:  68.3/100

  Subscores

  Parameter Simplicity     [████████████████░░░░] 80%
  Schema Simplicity        [██████████████░░░░░░] 70%
  Documentation Quality    [████████████░░░░░░░░] 60%
  Constraint Clarity       [██████████░░░░░░░░░░] 50%
  Example Coverage         [████████████████████] 100%
  Error Clarity            [████████████████░░░░] 80%
  Dependency Clarity       [██████████████████░░] 90%
  Identifier Clarity       [████████████████████] 100%
  Polymorphism Clarity     [████████████████████] 100%
  Discoverability          [████████████████████] 100%

  Top 3 Hotspot Operations

  POST /orders (createOrder)
    Agent Readiness: 38.7
    - High parameter count (12)
    - Deep schema nesting (depth 6)
    - Missing request and response examples

  PUT /orders/{id} (updateOrder)
    Agent Readiness: 44.0
    - Polymorphism (anyOf) without discriminator (3 anyOf)
    - No structured error responses (4xx/5xx)
```

#### JSON output

Use `--format=json` for machine-readable output:

```bash
redocly score openapi.yaml --format=json
```

The JSON output includes the full data: top-level scores, subscores, per-operation raw metrics, per-operation scores, dependency depths, and hotspot details with reasoning.
It leaves out the link to this page, so the output stays valid JSON.

The JSON format is suitable for CI pipelines, quality gates, or feeding results into dashboards.

### Rank the edits that raise the score

```bash
redocly score openapi.yaml --recommendations
```

The output adds the reachable score below the Agent Readiness score, and the recommendations and design findings after the hotspots:

```sh
  Agent Readiness:  75.6/100
  Reachable:        81.8/100 with every safe edit

  ...

  Recommendations

   +3.7  Add descriptions to operations (10 operations)
   +3.0  Add constraints to schema properties (13 operations)
         Contract risk: add only the constraints the API already enforces.
   +2.0  Add descriptions to schema properties (12 operations)
   +1.3  Add request body examples (3 operations)
   +1.3  Add response examples (3 operations)
   +0.8  Add descriptions to parameters (1 operation)

  Design findings

  Deep schema nesting (8 operations)
  High polymorphism count (8 operations)
```

With `--format=json`, the output adds three fields: `reachableScore`, `recommendations` sorted by impact, and `designFindings`.
