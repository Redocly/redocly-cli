---
'@redocly/cli': minor
'@redocly/openapi-core': minor
'@redocly/recheck': minor
---

Added the `redocly recheck` command.
It lints Markdown prose and structure from the `recheck` block in `redocly.yaml`, with presets named in the root `extends` (for example `recheck/markdown`).
Recheck presets resolve through `extends` like any plugin config, and the `recheck` block merges on top of them.
The engine's actions return data.
The CLI prints it.
