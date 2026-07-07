---
'@redocly/cli': minor
---

Added an experimental `generate-spec` command that infers an OpenAPI description from recorded HTTP traffic (HAR, Kong, Nginx/Apache JSON, NDJSON). Alternative body shapes are preserved as `oneOf` variants and `null` observations become type unions. The description can optionally be refined with an AI provider (`openai`-compatible endpoint, `claude` CLI, or `codex` CLI); refined output is only accepted when it keeps every observed operation and passes validation with the `spec` ruleset, and falls back to the deterministic baseline otherwise.
