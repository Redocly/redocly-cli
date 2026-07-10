# generate-spec [experimental]

Infer an OpenAPI description from recorded HTTP traffic, optionally refined with AI.

Traffic alone can only ever produce a _hypothesis_ about an API's real shape: types are
coarse, every observed property looks required, and there are no descriptions, enums, or
formats. `generate-spec` first builds that hypothesis deterministically, then can hand it to
an AI provider together with real sample exchanges to narrow it toward the true definition.

## Usage

```bash
# Deterministic inference only
redocly generate-spec ./traffic.har

# Refine the hypothesis with AI
redocly generate-spec ./traffic.har --with-ai --ai-provider claude -o openapi.yaml
```

The `<traffic>` argument is a file or folder of recorded traffic. Supported formats: HAR,
Kong, Nginx/Apache JSON, and NDJSON (auto-detected, or forced with `--traffic-format`). The
traffic parsing infrastructure is shared with the `drift` command.

## Deterministic inference

The baseline is derived from every exchange in the traffic:

- Identifier-like path segments (numeric, UUID, ULID, cuid, prefixed and opaque tokens)
  become named path parameters.
- Body schemas are merged across all observations; a property becomes optional as soon as
  one sample omits it.
- Alternative body shapes for the same operation are preserved as `oneOf` variants instead
  of being collapsed, and values observed as `null` produce type unions such as
  `["string", "null"]`.
- Object shapes that repeat across the document are extracted into `components/schemas` and
  referenced with `$ref`. The same entity is recognized when it appears as a list item and as
  a single resource, with different `required` sets, or with near-identical properties (at
  least 75% shared, with compatible types). Components are named from the path entity, the
  enclosing property name, or `Error` for error responses; a shape repeated only because its
  parent shape repeats stays inline.
- Observed string values are analyzed conservatively: when every value of a property (or
  parameter) matches the same well-known pattern it gets a `format` (`uuid`, `date-time`,
  `date`, `email`, `uri`, `ipv4`); when a string only ever takes a small set of
  identifier-like values with enough repetition (at least 4 observations, at most 5 distinct
  values, each seen twice on average) it becomes an `enum`. Enums apply to body properties
  and query parameters; path parameters and nullable unions get formats only. Evidence is
  pooled across all operations a shared component was observed in.
- Responses that were never received (status `0` in HAR captures) are ignored.

## AI refinement

The description is refined one operation at a time, so prompt and response stay small no
matter how large the recorded traffic or the resulting description is. Each prompt carries
a single operation from the baseline, the component schemas it references, the names of the
other components (reserved against collisions), and a capped, shape-diverse sample of the
real exchanges recorded for that operation (grouped by status and body shape, selected
round-robin so every observed payload variant is represented). The AI is instructed to
narrow types, add formats, enums, descriptions and examples, refine or add
`components/schemas`, and model alternative payloads explicitly with `oneOf` (plus
`discriminator`) and `allOf` composition.

Operations are processed sequentially and every accepted refinement is merged back before
the next prompt, so later operations see already-refined shared components. Progress is
reported per operation as prompts are sent.

The AI's answer is never trusted blindly. A refined operation is only accepted when it:

- keeps the exact path template and method — the AI cannot invent, drop, or rename
  operations because only the requested operation is merged back;
- keeps every response status code observed in the traffic;
- passes validation with the `spec` ruleset (checked against the description's full
  component set).

An operation whose refinement is rejected keeps its deterministic baseline (reported with
the reason), components no operation references anymore are pruned, and the final document
is linted again as a whole. If refinement fails for every operation, the command falls back
to the deterministic baseline. Each provider call times out after 5 minutes.

> **Warning:** `--with-ai` sends samples of the recorded traffic (URLs, query strings,
> request and response bodies) to the selected AI provider. Make sure the traffic contains
> no secrets or personal data you are not allowed to share.

## Options

| Option             | Description                                                                                           |
| ------------------ | ----------------------------------------------------------------------------------------------------- |
| `--type`           | Target description type. Only `openapi` is supported.                                                 |
| `--traffic-format` | Traffic input format (`auto`, `har`, `kong`, `nginx-json`, `apache-json`, `ndjson`).                  |
| `--server`         | Server URL the traffic was captured against. Scopes which requests are considered and sets `servers`. |
| `--title`          | Title for the generated description.                                                                  |
| `--with-ai`        | Refine the inferred description with an AI provider.                                                  |
| `--ai-provider`    | `claude`, `codex`, or `cursor` (default `claude`).                                                    |
| `--ai-model`       | Model passed to the selected provider.                                                                |
| `-o, --output`     | Write the result to a file instead of stdout.                                                         |

## AI providers

- **`claude`** — runs the local `claude` CLI in headless mode (`claude -p`).
- **`codex`** — runs the local `codex` CLI in non-interactive mode (`codex exec`).
- **`cursor`** — runs the local Cursor CLI in print mode (`cursor-agent -p`; the renamed
  `agent` binary is tried as a fallback).

All providers require the respective CLI to be installed and authenticated on the machine
running the command.
