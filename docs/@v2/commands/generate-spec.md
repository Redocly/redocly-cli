# `generate-spec`

The `generate-spec` command infers an OpenAPI description from recorded HTTP traffic.
The command reads a traffic log (or a folder of logs), builds a deterministic baseline description from the observed exchanges, and can optionally refine that baseline with an AI provider.

{% admonition type="warning" name="Experimental" %}
This is an experimental feature.
Its behavior, command, flags, and output may change in future releases.

The `generate-spec` command generates OpenAPI 3.1 descriptions only.
{% /admonition %}

Traffic alone can only ever produce a hypothesis about an API's real shape: types are coarse, every observed property looks required, and there are no descriptions, enums, or formats.
The `generate-spec` command first builds that hypothesis deterministically, then can hand it to an AI provider together with real sample exchanges to narrow it toward the true definition.

## Supported traffic formats

The traffic input can be provided in any of the following formats.
By default the format is detected automatically from the file contents:

- HAR
- Kong
- Nginx JSON
- Apache JSON
- NDJSON

Traffic parsing is shared with the [`drift`](./drift.md) command, so any log that works with `drift` works here too.

## Deterministic inference

The baseline description is derived from every exchange in the traffic:

- Identifier-like path segments (numeric, UUID, ULID, cuid, prefixed and opaque tokens) become named path parameters.
- Body schemas are merged across all observations; a property becomes optional as soon as one sample omits it.
- Alternative body shapes for the same operation are preserved as `oneOf` variants, and values observed as `null` produce type unions such as `["string", "null"]`.
- Object shapes that repeat across the document are extracted into `components/schemas` and referenced with `$ref`.
- String values are analyzed conservatively: properties whose values consistently match a well-known pattern get a `format` (`uuid`, `date-time`, `date`, `email`, `uri`, `ipv4`), and strings that only take a small, repeated set of identifier-like values become an `enum`.
- Responses that were never received (status `0` in HAR captures) are ignored.

## AI refinement

With `--with-ai`, the description is refined one operation at a time, so prompts stay small no matter how large the recorded traffic or the resulting description is.
Each prompt carries a single operation from the baseline, the component schemas it references, and a capped, shape-diverse sample of the real exchanges recorded for that operation.
The AI is instructed to narrow types, add formats, enums, descriptions and examples, refine or add `components/schemas`, and model alternative payloads explicitly with `oneOf` (plus `discriminator`) and `allOf` composition.

Up to `--ai-concurrency` operations are refined in parallel, and every accepted refinement is merged back as it arrives.

The AI's answer is never trusted blindly.
A refined operation is only accepted when it:

- keeps the exact path template and method — the AI cannot invent, drop, or rename operations;
- keeps every response status code observed in the traffic;
- passes validation with the `spec` ruleset.

An operation whose refinement is rejected keeps its deterministic baseline (reported with the reason), and the final document is linted again as a whole.
If refinement fails for every operation, the command falls back to the deterministic baseline.

The acceptance lint is intentionally pinned to the `spec` ruleset and does not use the project's `redocly.yaml`.
Lint the generated description with your own configuration afterward.

{% admonition type="warning" name="Data sharing" %}
`--with-ai` sends samples of the recorded traffic (URLs, query strings, request and response bodies) to the selected AI provider.
Make sure the traffic contains no secrets or personal data you are not allowed to share.
{% /admonition %}

### AI providers

Every provider runs a locally installed CLI, which must be installed and authenticated on the machine running the command.
The provider CLI is spawned in an empty temporary directory, so project context the CLIs normally auto-load from the working directory (`CLAUDE.md`, `AGENTS.md`, `.cursor/rules`) never enters the prompts.

- `claude` — runs the `claude` CLI in headless mode (`claude -p`), with built-in tools, MCP servers, settings, and session persistence disabled so every call is a plain completion.
  Because settings are not loaded, a model configured there does not apply: pass `--ai-model`, or the CLI's built-in default model is used.
- `codex` — runs the `codex` CLI in non-interactive mode (`codex exec`) with MCP servers and `AGENTS.md` discovery disabled and a read-only sandbox.
- `cursor` — runs the Cursor CLI in print mode (`cursor-agent -p`).

## Usage

```bash
redocly generate-spec <traffic>
redocly generate-spec <traffic> [--traffic-format=<option>] [--server=<url>]
redocly generate-spec <traffic> [--title=<string>] [--output=<file>]
redocly generate-spec <traffic> --with-ai [--ai-provider=<option>] [--ai-model=<string>] [--ai-concurrency=<number>]
```

## Options

| Option           | Type    | Description                                                                                                                                                                                                                                                      |
| ---------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| traffic          | string  | **REQUIRED.** Path to a traffic log file or folder (HAR, Kong, Nginx/Apache JSON, NDJSON).                                                                                                                                                                       |
| --type           | string  | Target API description type.<br/>**Possible values:** `openapi`. Default value is `openapi`.                                                                                                                                                                     |
| --traffic-format | string  | Traffic input format.<br/>**Possible values:** `auto`, `har`, `kong`, `nginx-json`, `apache-json`, `ndjson`. Default value is `auto`.                                                                                                                            |
| --server         | string  | Server URL the traffic was captured against (host, host + base path, or a path-only prefix like `/api`). Only requests under it are considered, the rest of their URL is treated as the API path, and it becomes the `servers` URL of the generated description. |
| --title          | string  | Title for the generated API description. Default value is `Generated API`.                                                                                                                                                                                       |
| --with-ai        | boolean | Refine the inferred description with an AI provider. Default value is `false`.                                                                                                                                                                                   |
| --ai-provider    | string  | AI provider used with `--with-ai`; runs the corresponding CLI in non-interactive mode.<br/>**Possible values:** `claude`, `codex`, `cursor`. Default value is `claude`.                                                                                          |
| --ai-model       | string  | Model passed to the selected AI provider. If not set, the provider's default model is used.                                                                                                                                                                      |
| --ai-concurrency | number  | Number of operations refined in parallel with `--with-ai`. Default value is `4`.                                                                                                                                                                                 |
| --output, -o     | string  | Write the generated description to this file instead of stdout.                                                                                                                                                                                                  |
| --config         | string  | Specify path to the [configuration file](../configuration/index.md).                                                                                                                                                                                             |
| --help           | boolean | Display help.                                                                                                                                                                                                                                                    |
| --version        | boolean | Display version number.                                                                                                                                                                                                                                          |

## Examples

### Generate a description from a HAR capture

```bash
redocly generate-spec ./traffic.har -o ./openapi.yaml
```

### Scope the traffic to a server

When the capture contains traffic for more than one host, or the API lives behind a base path (for example, a gateway that adds `/api`), use `--server` to declare the server the traffic was captured against.
Only requests under it are considered, and the remaining path becomes the API path:

```bash
redocly generate-spec ./traffic.har --server https://api.example.com/api -o ./openapi.yaml
```

### Refine the description with AI

```bash
redocly generate-spec ./traffic.har --with-ai --ai-provider claude -o ./openapi.yaml
```

### Speed up refinement for large APIs

Total time is roughly the per-operation AI time multiplied by the number of operations and divided by `--ai-concurrency`.
Raise the concurrency and pick a faster model to shorten the run:

```bash
redocly generate-spec ./traffic-logs/ --with-ai --ai-concurrency 12 --ai-model claude-sonnet-5 -o ./openapi.yaml
```

### Capture traffic and generate a description

```bash
redocly proxy --target https://api.example.com --har ./capture.har
# point your client at http://127.0.0.1:4040, then press Ctrl+C to stop
redocly generate-spec ./capture.har -o ./openapi.yaml
```

## Related commands

- [`proxy`](./proxy.md) captures live HTTP traffic into a HAR file that can be fed into `generate-spec`.
- [`drift`](./drift.md) detects drift between recorded HTTP traffic and an existing OpenAPI description.
