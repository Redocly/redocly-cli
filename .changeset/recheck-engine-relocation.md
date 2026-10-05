---
'@redocly/recheck': minor
---

Added the `@redocly/recheck` engine package to this repository.
It powers the upcoming `redocly recheck` command.
`@redocly/recheck/presets` exports the presets as a plugin for `@redocly/openapi-core`.

**Note:** the standalone `recheck` binary and `recheck.yaml` are removed.
Configuration moves to the `recheck` block of `redocly.yaml`, read by the `redocly recheck` command in a later release.
