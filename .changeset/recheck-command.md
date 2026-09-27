---
'@redocly/cli': minor
'@redocly/openapi-core': minor
'@redocly/recheck': minor
---

Added the `redocly recheck` command.
It lints Markdown prose and structure from the `recheck` block in `redocly.yaml`, with presets named in the root `extends` (for example `recheck/markdown`).
Recheck presets are named in the root `extends`; the command composes them and merges the `recheck` block on top.
The engine's actions return data.
The CLI prints it.
