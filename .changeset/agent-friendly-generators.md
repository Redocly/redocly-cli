---
'@redocly/client-generator': minor
'@redocly/cli': minor
---

Added agent-friendly client generation: built-in `python`, `go`, `php`, and `cli` generators, a language-neutral authoring toolkit, an `eject-generator` command that vendors any built-in generator into your repo together with its design as an agent skill, and verification against large real-world descriptions.

Selecting a generator now pulls in the generators it depends on: `--generator cli` emits the sdk and zod modules it needs (so the generated CLI validates requests by default and requires `zod` at run time), and `--generator tanstack-query` emits the sdk it wraps.

Added `goPackage` (`--go-package`) to set the package clause of the `go` generator's output, and `--bin-name` as the flag form of `binName`.

A custom generator can now declare its own options as a schema; publishers set them under `client.options.<generator>` and the values are validated — unknown key, wrong type, value outside an `enum`, missing required option — before anything is written, with defaults applied when `run` receives them.
