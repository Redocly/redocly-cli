# `generate-spec`

The `generate-spec` command infers an OpenAPI description from recorded HTTP traffic.
The command reads a traffic log (or a folder of logs), builds a deterministic baseline description from the observed exchanges, and can optionally refine that baseline with an AI provider.

{% admonition type="warning" name="Experimental" %}
This is an experimental feature.
Its behavior, command, flags, and output may change in future releases.

The `generate-spec` command generates OpenAPI 3.1 descriptions only.
{% /admonition %}

## Supported traffic formats

The traffic input can be provided in any of the following formats.
By default the format is detected automatically from the file contents:

- HAR
- Kong
- Nginx JSON
- Apache JSON
- NDJSON

Traffic parsing is shared with the [`drift`](./drift.md) command, so any log that works with `drift` works here too.

## How it works

The baseline description is inferred directly from the recorded exchanges: identifier-like path segments become named path parameters, request and response schemas are merged across all observations, repeated object shapes are extracted into `components/schemas`, and consistently formatted string values get `format` or `enum` hints.

A description inferred from traffic alone is a hypothesis: types are coarse and there are no descriptions, enums, or examples beyond what was observed.
With `--with-ai`, the command sends each operation together with sample exchanges to an AI provider, which narrows types and adds formats, enums, descriptions, and examples.

The AI's answer is never trusted blindly: a refined operation is only accepted when it keeps the operation's path, method, and observed response status codes, and passes validation with the `spec` ruleset.
Rejected refinements keep their baseline version, and if refinement fails entirely the command falls back to the baseline description.
The validation uses the built-in `spec` ruleset, not your project's `redocly.yaml` — lint the generated description with your own configuration afterward.

{% admonition type="warning" name="Data sharing" %}
`--with-ai` sends samples of the recorded traffic (URLs, query strings, request and response bodies) to the selected AI provider.
Make sure the traffic contains no secrets or personal data you are not allowed to share.
{% /admonition %}

### AI providers

Refinement runs a locally installed AI CLI in non-interactive mode: `claude` (Claude Code), `codex` (Codex CLI), or `cursor` (Cursor CLI).
The selected CLI must be installed and authenticated on the machine running the command.

The provider runs in isolation: project context the CLIs normally load (such as `CLAUDE.md`, `AGENTS.md`, or `.cursor/rules`) and settings like a configured model do not apply.
Use `--ai-model` to choose a model, or the provider's default is used.

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
| --ai-provider    | string  | AI provider used with `--with-ai`. Runs the corresponding CLI in non-interactive mode.<br/>**Possible values:** `claude`, `codex`, `cursor`. Default value is `claude`.                                                                                          |
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

For descriptions with many operations, raise the concurrency and pick a faster model to shorten the run:

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
