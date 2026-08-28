---
'@redocly/cli': minor
---

Added `--with-ai`, `--ai-provider`, `--ai-model`, and `--max-workflows` options to the `generate-arazzo` command.
`--with-ai` redesigns the generated one-workflow-per-operation skeleton by a locally installed AI CLI (`claude`, `codex`, or `cursor`) into realistic multi-step workflows using OpenAPI descriptions as context.
The AI designs at most `--max-workflows` workflows (default 10), and the generated file is marked as AI-inferred.
Descriptions too large for a single prompt are handled in two phases: the AI first selects scenarios from a compact operation index, then designs each workflow separately.
