---
'@redocly/cli': minor
---

Added an experimental `generate-spec` command that infers an OpenAPI description from recorded HTTP traffic (HAR, Kong, Nginx/Apache JSON, NDJSON) passed as a single file or a folder searched recursively. Alternative body shapes are preserved as `oneOf` variants and `null` observations become type unions. The description can optionally be refined with an AI provider (the `claude`, `codex`, or `cursor` CLI): the refinement runs one operation per prompt (up to `--ai-concurrency` operations in parallel, default 4) with progress reported per operation, so it scales to large traffic captures; refined output is only accepted when it keeps the observed operation and status codes and passes validation with the `spec` ruleset, and each rejected operation keeps its deterministic baseline.
