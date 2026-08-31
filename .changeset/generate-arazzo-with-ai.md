---
'@redocly/cli': minor
---

Added `--with-ai`, `--ai-provider`, `--ai-model`, and `--max-workflows` options to the `generate-arazzo` command.
`--with-ai` uses a local AI CLI (`claude`, `codex`, or `cursor`) and OpenAPI descriptions to redesign the generated one-workflow-per-operation skeleton into multi-step workflows.
The AI designs at most `--max-workflows` workflows (default 10), and the generated file is marked as AI-inferred.
For descriptions that don't fit a single prompt, the AI first selects scenarios from a compact operation index, then it designs each workflow separately.
