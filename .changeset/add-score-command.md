---
'@redocly/cli': minor
---

Added new `score` command that analyzes OpenAPI 3.x descriptions and produces integration simplicity and AI agent readiness scores (0-100).
Reports normalized subscores, raw per-operation metrics, and top hotspot operations with human-readable explanations. Supports `--format=stylish` (default) and `--format=json` output.
