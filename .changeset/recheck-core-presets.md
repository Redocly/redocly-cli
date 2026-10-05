---
'@redocly/openapi-core': minor
---

Added the `plugins` option to `loadConfig` and `createConfig`: ready plugin objects that are added next to the built-in plugin.
Resolved configs carry the merged `recheck` block in `Config.recheck`.
A `recheck/*` entry in `extends` resolves like any other preset when a plugin with the id `recheck` is passed, and is skipped otherwise.
`lint` reads no rules from the block.
A custom plugin cannot use the id `recheck`.
