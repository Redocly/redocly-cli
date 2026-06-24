---
'@redocly/cli': minor
---

Added an experimental `generate-spec` command that infers an OpenAPI description from recorded HTTP traffic (HAR, Kong, Nginx/Apache JSON, NDJSON) and can optionally refine it with an AI provider (`openai`-compatible endpoint, `claude` CLI, or `codex` CLI) to narrow the inferred hypothesis toward the real API shape.
