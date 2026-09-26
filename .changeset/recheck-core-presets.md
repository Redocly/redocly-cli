---
'@redocly/openapi-core': minor
---

Resolved configs carry a merged `recheck` block, and `Config.recheck` exposes it.
Recheck presets are the configs of a built-in plugin with id `recheck`; a custom plugin cannot use that id.
Core imports the preset data from `@redocly/recheck/config`, a light entry that loads in a few milliseconds.
