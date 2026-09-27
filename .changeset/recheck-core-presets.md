---
'@redocly/openapi-core': minor
---

Resolved configs carry the merged `recheck` block in `Config.recheck` and the `recheck/*` presets from `extends`, in order, in `Config.recheckExtends`.
`lint` reads no rules from them.
A custom plugin cannot use the id `recheck`.
