---
'@redocly/client-generator': minor
'@redocly/cli': minor
---

Added agent-friendly client generation: built-in `python`, `go`, `php`, and `cli` generators, a language-neutral authoring toolkit, an `eject-generator` command that vendors any built-in generator into your repo together with its design as an agent skill in `.claude/skills/`, and verification against large real-world descriptions.

Selecting a generator now pulls in the generators it depends on: `--generator cli` emits the sdk and zod modules it needs (so the generated CLI validates requests by default and requires `zod` at run time), and `--generator tanstack-query` emits the sdk it wraps.

Added `goPackage` (`--go-package`) to set the package clause of the `go` generator's output, and `--bin-name` as the flag form of `binName`.

A custom generator can now declare its own options as a schema; publishers set them under `client.options.<generator>` and the values are validated — unknown key, wrong type, value outside an `enum`, missing required option — before anything is written, with defaults applied when `run` receives them.

**Note:** the per-operation pagination extension is now `x-redoclyPagination`, matching the camelCase of every other Redocly extension. Rename it in descriptions that declared `x-redocly-pagination`; the old spelling is no longer read.

`eject-generator` now wires itself up: it records `@redocly/client-generator` in your `devDependencies` and adds the ejected file to `client.generators`, printing the snippet to add by hand only when the configuration file has a shape it won't edit blind.
