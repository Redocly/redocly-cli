---
'@redocly/openapi-core': minor
---

Resolved configs carry a merged `recheck` block, and `Config.recheck` exposes it.
Recheck presets are the configs of a built-in plugin with id `recheck`; a custom plugin cannot use that id.
Core loads the engine with a dynamic import that carries a `webpackIgnore` hint.
webpack and rspack leave that import to runtime, so a bundle of core must be able to resolve `@redocly/recheck` at runtime.
esbuild bundles the engine into a split chunk.
