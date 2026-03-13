# `score`

## Introduction

The `score` command analyzes an OpenAPI description and produces two composite scores:

- **Integration Simplicity** (0–100): How easy is this API to integrate? Higher is better.
- **Agent Readiness** (0–100): How usable is this API by AI agents and LLM-based tooling? Higher is better.

In addition to the top-level scores, the command reports normalized subscores, raw metrics for every operation, and a list of **hotspot operations** — the endpoints most likely to cause integration friction — along with human-readable explanations.

{% admonition type="warning" name="OpenAPI 3.x only" %}
The `score` command supports OpenAPI 3.0, 3.1, and 3.2 descriptions.
OpenAPI 2.0 (Swagger) and AsyncAPI are not currently supported.
{% /admonition %}

### Metrics

The following raw metrics are collected per operation and aggregated across the document:

| Metric                             | Description                                                                                                                          |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Parameter count                    | Total parameters (path, query, header, cookie) per operation.                                                                        |
| Required parameter count           | How many of those parameters are required.                                                                                           |
| Request body presence              | Whether the operation defines a request body.                                                                                        |
| Top-level writable field count     | Number of non-`readOnly` top-level properties in request schemas.                                                                    |
| Max request/response schema depth  | Deepest nesting level in request and response schemas.                                                                               |
| Polymorphism count                 | Number of `oneOf`, `anyOf`, and `allOf` usages. `anyOf` is penalized more heavily.                                                   |
| Property count                     | Total schema properties across request and response.                                                                                 |
| Description coverage               | Fraction of operations, parameters, and schema properties that have descriptions.                                                    |
| Ambiguous identifier count         | Parameters with generic names (e.g. `id`, `name`, `type`) and no description.                                                        |
| Constraint coverage                | Count of constraining keywords (`enum`, `format`, `pattern`, `minimum`, `maximum`, `minLength`, `maxLength`, `discriminator`, etc.). |
| Request/response example coverage  | Whether request and response media types include `example` or `examples`.                                                            |
| Structured error response coverage | How many 4xx/5xx responses include a content schema or meaningful description.                                                       |
| Security scheme coverage           | Whether operations reference documented security schemes with descriptions.                                                          |
| Cross-operation dependency depth   | Inferred from shared `$ref` usage across operations; deeper shared-schema graphs indicate tightly coupled multi-step interactions.   |

### Subscores

Subscores are normalized to 0–1 and grouped into two categories:

**Integration Simplicity subscores:** `parameterSimplicity`, `schemaSimplicity`, `documentationQuality`, `constraintClarity`, `exampleCoverage`, `errorClarity`, `dependencyClarity`.

**Agent Readiness subscores:** `documentationQuality`, `constraintClarity`, `exampleCoverage`, `errorClarity`, `identifierClarity`, `dependencyClarity`, `polymorphismClarity`.

### Hotspots

The command identifies the operations with the lowest scores and provides reasons such as:

- "High parameter count (N)"
- "Deep schema nesting (depth M)"
- "Polymorphism (anyOf) without discriminator"
- "Missing request and response examples"
- "No structured error responses (4xx/5xx)"
- "Missing operation description"

## Usage

```bash
redocly score <api>
redocly score <api> [--format=<option>] [--config=<path>]
```

## Options

| Option        | Type    | Description                                                                                                                                    |
| ------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| api           | string  | **REQUIRED.** Path to the API description filename or alias that you want to score. Refer to [the API section](#specify-api) for more details. |
| --config      | string  | Specify path to the [configuration file](../configuration/index.md).                                                                           |
| --format      | string  | Format for the output.<br />**Possible values:** `stylish`, `json`. Default value is `stylish`.                                                |
| --help        | boolean | Show help.                                                                                                                                     |
| --lint-config | string  | Specify the severity level for the configuration file. <br/> **Possible values:** `warn`, `error`, `off`. Default value is `warn`.             |
| --version     | boolean | Show version number.                                                                                                                           |

## Examples

### Specify API

#### Pass an API directly

```bash
redocly score openapi/openapi.yaml
```

### Specify output format

#### Stylish output (default)

The default output format shows a human-readable summary in your terminal:

```sh
  Scores

  Integration Simplicity:  72.5/100
  Agent Readiness:         68.3/100

  Integration Simplicity Subscores

  Parameter Simplicity     [████████████████░░░░] 80%
  Schema Simplicity        [██████████████░░░░░░] 70%
  Documentation Quality    [████████████░░░░░░░░] 60%
  Constraint Clarity       [██████████░░░░░░░░░░] 50%
  Example Coverage         [████████████████████] 100%
  Error Clarity            [████████████████░░░░] 80%
  Dependency Clarity       [██████████████████░░] 90%

  Top 3 Hotspot Operations

  POST /orders (createOrder)
    Integration Simplicity: 45.2  Agent Readiness: 38.7
    - High parameter count (12)
    - Deep schema nesting (depth 6)
    - Missing request and response examples

  PUT /orders/{id} (updateOrder)
    Integration Simplicity: 52.1  Agent Readiness: 44.0
    - Polymorphism (anyOf) without discriminator (3 anyOf)
    - No structured error responses (4xx/5xx)
```

#### JSON output

Use `--format=json` for machine-readable output:

```bash
redocly score openapi.yaml --format=json
```

The JSON output includes the full data: top-level scores, subscores, per-operation raw metrics, per-operation scores, workflow depths, and hotspot details with reasoning.

The JSON format is suitable for CI pipelines, quality gates, or feeding results into dashboards.
