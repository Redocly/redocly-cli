---
'@redocly/cli': minor
---

Added the `--coverage` and `--coverage-output` options to the experimental `drift` command.
`--coverage` prints how much of the OpenAPI description the recorded traffic exercised (operations, parameters, schema properties, and response codes), and `--coverage-output` writes a detailed JSON report that lists the covered and missing items of every operation.
