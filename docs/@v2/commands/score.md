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

## Usage

```bash
redocly score <api>
redocly score <api> [--format=<option>] [--suggestions]
```

## Options

| Option               | Type    | Description                                                                                                                                                   |
| -------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| api                  | string  | **REQUIRED.** Path to the API description filename or alias that you want to score. Refer to [the API section](#specify-api) for more details.                |
| --config             | string  | Specify path to the [configuration file](../configuration/index.md).                                                                                          |
| --format             | string  | Format for the output.<br />**Possible values:** `stylish`, `json`. Default value is `stylish`.                                                               |
| --operation-details  | boolean | Print a per-operation metrics table sorted by property count.                                                                                                 |
| --debug-operation-id | string  | Print a detailed schema breakdown for a specific operation (by `operationId` or `METHOD /path`).                                                              |
| --suggestions        | boolean | Append copy-paste prompts (for LLM-assisted editing) for each hotspot operation. Also adds a `suggestion` field per hotspot in JSON output. Default: `false`. |
| --help               | boolean | Show help.                                                                                                                                                    |
| --lint-config        | string  | Specify the severity level for the configuration file. <br/> **Possible values:** `warn`, `error`, `off`. Default value is `warn`.                            |
| --version            | boolean | Show version number.                                                                                                                                          |

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

The JSON format is suitable for CI pipelines, quality gates, or feeding results into dashboards.

### Suggestions (LLM prompts)

With `--suggestions`, the command adds an **Agent prompts (copy/paste)** section after hotspots in stylish output. Each hotspot gets a fenced block containing a self-contained prompt you can paste into an assistant to improve that operation in your OpenAPI file.

With `--format=json` and `--suggestions`, each hotspot object includes a `suggestion` string (the same prompt text). Structured `issues` codes are not included in JSON output.

These prompts are advisory; review generated edits before committing them.
