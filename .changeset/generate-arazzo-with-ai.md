---
'@redocly/cli': minor
---

Added `--with-ai`, `--ai-provider`, and `--max-workflows` options to the `generate-arazzo` command.
With `--with-ai`, the generated one-workflow-per-operation skeleton is redesigned by a locally installed AI CLI (`claude`, `codex`, or `cursor`) into realistic multi-step workflows that chain operations through outputs and runtime expressions, using the OpenAPI description as context.
The AI designs at most `--max-workflows` workflows (default 10), and the generated file is marked as AI-inferred.
