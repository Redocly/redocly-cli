---
'@redocly/client-generator': minor
'@redocly/cli': minor
---

Added `redocly eject-generator` and `redocly scaffold-generator` — vendor a built-in language generator (`python`, `go`, `php`) into your repo as an editable file (with a pristine snapshot, three-way `--update` merges, and byte-identical output when unmodified), or scaffold a custom generator skeleton; both drop the `AGENTS.md` generator-authoring guide for coding agents. A path-loaded generator may now take over a built-in name, and the new `@redocly/client-generator/runtime-sources` entry serves the embedded-runtime sources to ejected generators.
