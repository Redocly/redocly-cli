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

## Options

| Option             | Description                                                                                           |
| ------------------ | ----------------------------------------------------------------------------------------------------- |
| `--type`           | Target description type. Only `openapi` is supported.                                                 |
| `--traffic-format` | Traffic input format (`auto`, `har`, `kong`, `nginx-json`, `apache-json`, `ndjson`).                  |
| `--traffic-plugin` | Path to an external traffic parser module (repeatable).                                               |
| `--server`         | Server URL the traffic was captured against. Scopes which requests are considered and sets `servers`. |
| `--title`          | Title for the generated description.                                                                  |
| `--with-ai`        | Refine the inferred description with an AI provider.                                                  |
| `--ai-provider`    | `openai`, `claude`, or `codex` (default `claude`).                                                    |
| `--ai-model`       | Model passed to the selected provider.                                                                |
| `-o, --output`     | Write the result to a file instead of stdout.                                                         |

## AI providers

All providers receive the inferred baseline plus a capped, representative sample of real
exchanges, and are instructed to return only a valid OpenAPI 3.1 YAML document. If refinement
fails for any reason, the command falls back to the deterministic baseline.

- **`openai`** — calls an OpenAI-compatible `chat/completions` endpoint. Configure with the
  `OPENAI_ENDPOINT` and `OPENAI_API_KEY` environment variables (and optionally `OPENAI_MODEL`).
  Many providers expose an OpenAI-compatible endpoint, so this covers a wide range of models.
- **`claude`** — runs the local `claude` CLI in headless mode (`claude -p`).
- **`codex`** — runs the local `codex` CLI in non-interactive mode (`codex exec`).

The `claude` and `codex` providers require the respective CLI to be installed and authenticated
on the machine running the command.
