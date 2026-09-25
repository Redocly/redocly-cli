---
'@redocly/cli': minor
---

Added the `--coverage` and `--coverage-output` options to the experimental `drift` command.
`--coverage` prints how much of the OpenAPI description the recorded traffic exercised.
`--coverage-output` lists the covered and missing items of every operation in a JSON file.

Fixed the `schema-consistency` rule of the `drift` command so that a required property marked `readOnly` or `writeOnly` through `allOf` is no longer reported as missing.
