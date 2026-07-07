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

- Identifier-like path segments (numeric, UUID, ULID, prefixed and opaque tokens) become
  named path parameters.
- Body schemas are merged across all observations; a property becomes optional as soon as
  one sample omits it.
- Alternative body shapes for the same operation are preserved as `oneOf` variants instead
  of being collapsed, and values observed as `null` produce type unions such as
  `["string", "null"]`.
- Responses that were never received (status `0` in HAR captures) are ignored.

## AI refinement

All providers receive the inferred baseline plus a capped, shape-diverse sample of real
exchanges: samples are grouped by operation, status, and body shape, and selected
round-robin so every operation and every observed payload variant is represented. The AI is
instructed to narrow types, add formats, enums, descriptions and examples, extract shared
shapes into `components/schemas`, and model alternative payloads explicitly with `oneOf`
(plus `discriminator`) and `allOf` composition.

The AI's answer is never trusted blindly:

- Every operation from the baseline must still be present — a response that dropped
  operations (for example because it was truncated) is rejected.
- Operations that never appear in the traffic are removed with a warning.
- The document is linted with the `spec` ruleset; validation errors reject it.

If refinement fails for any reason, the command falls back to the deterministic baseline.
Provider calls time out after 5 minutes.

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
| `--ai-provider`    | `openai`, `claude`, or `codex` (default `claude`).                                                    |
| `--ai-model`       | Model passed to the selected provider.                                                                |
| `-o, --output`     | Write the result to a file instead of stdout.                                                         |

## AI providers

- **`openai`** — calls an OpenAI-compatible `chat/completions` endpoint. Configure with the
  `OPENAI_ENDPOINT` and `OPENAI_API_KEY` environment variables (and optionally `OPENAI_MODEL`).
  Many providers expose an OpenAI-compatible endpoint, so this covers a wide range of models.
- **`claude`** — runs the local `claude` CLI in headless mode (`claude -p`).
- **`codex`** — runs the local `codex` CLI in non-interactive mode (`codex exec`).

The `claude` and `codex` providers require the respective CLI to be installed and authenticated
on the machine running the command.
