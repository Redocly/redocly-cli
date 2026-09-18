---
'@redocly/cli': minor
'@redocly/openapi-core': minor
'@redocly/recheck': minor
---

Added the `redocly recheck` command.
It lints Markdown prose and structure from the `recheck` block in `redocly.yaml`, with presets named in the root `extends` (for example `recheck/markdown`).
`check-config` accepts the block, and the `lint` command ignores `recheck/*` presets.
The engine `Logger` gained an `output` channel for report payloads.
`runReadability` now writes progress through `log` in every mode, so library callers see progress lines in JSON mode too.
